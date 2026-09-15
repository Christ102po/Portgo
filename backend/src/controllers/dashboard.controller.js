const prisma = require("../lib/prisma");

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function todayWindow() {
  const start = startOfDay(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function tripDetailRow(trip) {
  return {
    id: trip.id,
    kind: "trip",
    fullName: trip.passenger?.fullName || "Unknown passenger",
    passengerType: trip.passenger?.passengerType || null,
    contact: trip.passenger?.contactNumber || trip.passenger?.email || trip.passenger?.passportNumber || "—",
    email: trip.passenger?.email || null,
    passNumber: trip.passNumber || null,
    transactionType: trip.transactionType || null,
    shipName: trip.ship?.name || null,
    route: trip.schedule?.route || null,
    departureTime: trip.schedule?.departureTime || null,
    status: trip.status || null,
    createdAt: trip.createdAt,
    detailLabel: null,
  };
}

function passengerDetailRow(passenger, detailLabel) {
  return {
    id: passenger.id,
    kind: "passenger",
    fullName: passenger.fullName || "Unknown passenger",
    passengerType: passenger.passengerType || null,
    contact: passenger.contactNumber || passenger.email || passenger.passportNumber || "—",
    email: passenger.email || null,
    passNumber: null,
    transactionType: null,
    shipName: null,
    route: null,
    departureTime: null,
    status: null,
    createdAt: passenger.createdAt,
    detailLabel,
  };
}

async function getStats(req, res) {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const last30DaysStart = new Date(todayStart);
  last30DaysStart.setDate(last30DaysStart.getDate() - 29);
  const last7DaysStart = new Date(todayStart);
  last7DaysStart.setDate(last7DaysStart.getDate() - 6);

  const [
    totalToday,
    signInToday,
    signOutToday,
    localCount,
    touristCount,
    touristVerifiedCount,
    boardedCount,
    cancelledCount,
    noShowCount,
    totalYesterday,
    local30d,
    tourist30d,
    recentTrips,
  ] = await Promise.all([
    prisma.trip.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, transactionType: "SIGN_IN" } }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, transactionType: "SIGN_OUT" } }),
    prisma.passenger.count({ where: { createdAt: { gte: todayStart }, passengerType: { not: "FOREIGN_TOURIST" } } }),
    prisma.passenger.count({ where: { createdAt: { gte: todayStart }, passengerType: "FOREIGN_TOURIST" } }),
    prisma.passenger.count({
      where: { createdAt: { gte: todayStart }, passengerType: "FOREIGN_TOURIST", isPassportVerified: true, isFaceVerified: true },
    }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, status: "BOARDED" } }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, status: "CANCELLED" } }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, status: "NO_SHOW" } }),
    prisma.trip.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.passenger.count({ where: { createdAt: { gte: last30DaysStart }, passengerType: { not: "FOREIGN_TOURIST" } } }),
    prisma.passenger.count({ where: { createdAt: { gte: last30DaysStart }, passengerType: "FOREIGN_TOURIST" } }),
    prisma.trip.findMany({ where: { createdAt: { gte: last7DaysStart } }, select: { createdAt: true } }),
  ]);

  const hourCounts = Array.from({ length: 24 }, () => 0);
  for (const t of recentTrips) hourCounts[new Date(t.createdAt).getHours()] += 1;
  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

  res.json({
    totalToday,
    signInToday,
    signOutToday,
    localCount,
    touristCount,
    touristVerifiedCount,
    boardedCount,
    cancelledCount,
    noShowCount,
    trend: { totalTodayChangePct: pctChange(totalToday, totalYesterday) },
    localTouristRatio30d: { local: local30d, tourist: tourist30d },
    peakHours,
  });
}

async function getDetails(req, res) {
  const type = String(req.query.type || "").trim();
  const { start, end } = todayWindow();
  const createdToday = { gte: start, lt: end };
  const take = 200;

  const tripTypes = {
    totalToday: { createdAt: createdToday },
    signInToday: { createdAt: createdToday, transactionType: "SIGN_IN" },
    signOutToday: { createdAt: createdToday, transactionType: "SIGN_OUT" },
    boardedCount: { createdAt: createdToday, status: "BOARDED" },
    cancelledCount: { createdAt: createdToday, status: "CANCELLED" },
    noShowCount: { createdAt: createdToday, status: "NO_SHOW" },
  };

  if (tripTypes[type]) {
    const where = tripTypes[type];
    const [rows, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: { passenger: true, ship: true, schedule: true },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.trip.count({ where }),
    ]);

    return res.json({ type, total, limit: take, rows: rows.map(tripDetailRow) });
  }

  if (type === "localsTouristsVerified") {
    const localWhere = { createdAt: createdToday, passengerType: { not: "FOREIGN_TOURIST" } };
    const verifiedTouristWhere = {
      createdAt: createdToday,
      passengerType: "FOREIGN_TOURIST",
      isPassportVerified: true,
      isFaceVerified: true,
    };

    const [locals, verifiedTourists, localTotal, verifiedTouristTotal] = await Promise.all([
      prisma.passenger.findMany({ where: localWhere, orderBy: { createdAt: "desc" }, take }),
      prisma.passenger.findMany({ where: verifiedTouristWhere, orderBy: { createdAt: "desc" }, take }),
      prisma.passenger.count({ where: localWhere }),
      prisma.passenger.count({ where: verifiedTouristWhere }),
    ]);

    const rows = [
      ...locals.map((p) => passengerDetailRow(p, "Local passenger")),
      ...verifiedTourists.map((p) => passengerDetailRow(p, "Verified foreign tourist")),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, take);

    return res.json({
      type,
      total: localTotal + verifiedTouristTotal,
      limit: take,
      rows,
      summary: { local: localTotal, verifiedTourist: verifiedTouristTotal },
    });
  }

  return res.status(400).json({ message: "Unknown dashboard detail type" });
}

module.exports = { getStats, getDetails };
