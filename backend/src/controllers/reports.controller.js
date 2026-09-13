const prisma = require("../lib/prisma");
const { toCsv } = require("../utils/csv");
const { resolveRange } = require("../lib/dateRange");
const { categorizeVehicle } = require("../lib/vehicleCategory");
const { getFare } = require("../lib/fareTable");
const { streamManifest } = require("../lib/pdfManifest");
const { streamExecutiveSummary } = require("../lib/pdfExecutiveSummary");
const { logAudit } = require("../lib/audit");

function buildWhere(query, range) {
  const { shipId, route } = query;
  const where = { createdAt: { gte: range.start, lt: range.end } };
  if (shipId) where.shipId = shipId;
  if (route) where.schedule = { route };
  return where;
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function bucketDaily(trips, range) {
  const buckets = new Map();
  const cursor = new Date(range.start);
  while (cursor < range.end) {
    buckets.set(dayKey(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const trip of trips) {
    const key = dayKey(new Date(trip.createdAt));
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

async function fetchTrips(where) {
  return prisma.trip.findMany({
    where,
    include: { passenger: true, ship: true, schedule: true },
  });
}

async function getSummary(req, res) {
  const range = resolveRange(req.query);
  const where = buildWhere(req.query, range);

  const previousStart = new Date(range.start.getTime() - (range.end.getTime() - range.start.getTime()));
  const previousWhere = { ...where, createdAt: { gte: previousStart, lt: range.start } };

  const [trips, previousCount] = await Promise.all([
    fetchTrips(where),
    prisma.trip.count({ where: previousWhere }),
  ]);

  const totalPassengers = trips.length;
  const signIns = trips.filter((t) => t.transactionType === "SIGN_IN").length;
  const signOuts = trips.filter((t) => t.transactionType === "SIGN_OUT").length;
  const localCount = trips.filter((t) => t.passenger.passengerType !== "FOREIGN_TOURIST").length;
  const touristCount = trips.filter((t) => t.passenger.passengerType === "FOREIGN_TOURIST").length;

  const statusBreakdown = { ACTIVE: 0, BOARDED: 0, CANCELLED: 0, NO_SHOW: 0, COMPLETED: 0, REBOOKED: 0 };
  for (const t of trips) statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1;

  const vehicleBreakdown = { motorcycle: 0, car: 0, cargo: 0, other: 0 };
  for (const t of trips) {
    if (t.hasVehicle) vehicleBreakdown[categorizeVehicle(t.vehicleType)] += 1;
  }

  const sellableTrips = trips.filter((t) => t.status !== "CANCELLED" && t.status !== "REBOOKED");
  const revenue = sellableTrips.reduce((sum, t) => sum + getFare(t), 0);

  const classDistribution = { ECONOMY: 0, TOURIST_AIRCON: 0, BUSINESS: 0, UNCLASSED: 0 };
  for (const t of sellableTrips) {
    classDistribution[t.accommodationClass || "UNCLASSED"] += 1;
  }

  const hourCounts = Array.from({ length: 24 }, () => 0);
  for (const t of trips) hourCounts[new Date(t.createdAt).getHours()] += 1;
  const hourlyBookingTrend = hourCounts.map((count, hour) => ({ hour, count }));

  const trendPct = previousCount === 0
    ? (totalPassengers > 0 ? 100 : 0)
    : Math.round(((totalPassengers - previousCount) / previousCount) * 100);

  res.json({
    range: { start: range.start, end: range.end },
    totalPassengers,
    signIns,
    signOuts,
    localCount,
    touristCount,
    statusBreakdown,
    vehicleBreakdown,
    dailyTrend: bucketDaily(trips, range),
    trend: { previousCount, changePct: trendPct },
    ticketsSold: sellableTrips.length,
    revenue,
    classDistribution,
    hourlyBookingTrend,
  });
}

async function exportReport(req, res) {
  const range = resolveRange(req.query);
  const where = buildWhere(req.query, range);
  const format = req.query.format === "pdf" ? "pdf" : "csv";
  const trips = await fetchTrips(where);
  trips.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (format === "csv") {
    const columns = [
      { label: "Pass Number", value: (r) => r.passNumber },
      { label: "Full Name", value: (r) => r.passenger.fullName },
      { label: "Contact Number", value: (r) => r.passenger.contactNumber },
      { label: "Type", value: (r) => r.passenger.passengerType },
      { label: "Transaction", value: (r) => r.transactionType },
      { label: "Ship", value: (r) => r.ship.name },
      { label: "Route", value: (r) => r.schedule.route },
      { label: "Accommodation Class", value: (r) => r.accommodationClass || "N/A" },
      { label: "Fare (PHP)", value: (r) => getFare(r).toFixed(2) },
      {
        label: "Verification Status",
        value: (r) =>
          r.passenger.passengerType === "FOREIGN_TOURIST"
            ? r.passenger.isPassportVerified && r.passenger.isFaceVerified
              ? "Passport & Face Verified"
              : "Unverified"
            : r.passenger.isPhoneVerified && r.passenger.isDocumentVerified
            ? "Phone & ID Verified"
            : r.passenger.isPhoneVerified
            ? "Phone Verified"
            : "Unverified",
      },
      { label: "ID Document Uploaded", value: (r) => (r.passenger.verificationDocumentUrl ? "Yes" : "No") },
      { label: "Status", value: (r) => r.status },
      { label: "Vehicle", value: (r) => (r.hasVehicle ? `${r.vehicleType || "Vehicle"} (${r.plateNumber || "N/A"})` : "None") },
      { label: "Date", value: (r) => new Date(r.createdAt).toISOString() },
    ];
    const csv = toCsv(trips, columns);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="portgo-report-${dayKey(new Date())}.csv"`);
    return res.send(csv);
  }

  return streamManifest(res, { trips, range, query: req.query });
}

async function computeRangeSummary(rangeKey) {
  const range = resolveRange({ range: rangeKey });
  const trips = await fetchTrips({ createdAt: { gte: range.start, lt: range.end } });

  return {
    totalPassengers: trips.length,
    localCount: trips.filter((t) => t.passenger.passengerType !== "FOREIGN_TOURIST").length,
    touristCount: trips.filter((t) => t.passenger.passengerType === "FOREIGN_TOURIST").length,
    signIns: trips.filter((t) => t.transactionType === "SIGN_IN").length,
    signOuts: trips.filter((t) => t.transactionType === "SIGN_OUT").length,
    boarded: trips.filter((t) => t.status === "BOARDED").length,
    cancelled: trips.filter((t) => t.status === "CANCELLED").length,
    noShow: trips.filter((t) => t.status === "NO_SHOW").length,
  };
}

async function exportExecutiveSummary(req, res) {
  const [week, month, year] = await Promise.all([
    computeRangeSummary("week"),
    computeRangeSummary("month"),
    computeRangeSummary("year"),
  ]);

  await logAudit(req, "EXECUTIVE_SUMMARY_EXPORTED", "Exported Port Executive Summary report (Week/Month/Year)");

  streamExecutiveSummary(res, { week, month, year, generatedBy: req.admin?.fullName || req.admin?.email });
}

module.exports = { getSummary, exportReport, exportExecutiveSummary };
