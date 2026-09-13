const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");
const { checkWatchlist } = require("../lib/watchlist");
const { toCsv } = require("../utils/csv");

async function buildSecurityAlert(passengers) {
  for (const p of passengers) {
    const match = await checkWatchlist(p);
    if (match) {
      return { matched: true, passengerName: p.fullName, reason: match.reason };
    }
  }
  return null;
}

const NOT_BOARDABLE = ["CANCELLED", "NO_SHOW", "REBOOKED"];
const OCCUPYING_STATUSES = ["ACTIVE", "BOARDED"];
const GATE_SCAN_ACTION = "GATE_SCAN";

async function boardCounts(scheduleId) {
  const [boardedCount, totalBooked] = await Promise.all([
    prisma.trip.count({ where: { scheduleId, status: "BOARDED" } }),
    prisma.trip.count({ where: { scheduleId, status: { in: OCCUPYING_STATUSES } } }),
  ]);
  return { boardedCount, totalBooked };
}

async function scan(req, res) {
  const { passNumber: code } = req.body;

  if (code.startsWith("FAM-")) {
    const family = await prisma.familyBooking.findUnique({
      where: { masterCode: code },
      include: { trips: { include: { passenger: true, ship: true, schedule: true } } },
    });
    if (!family || family.trips.length === 0) {
      return res.status(404).json({ message: "Family booking not found" });
    }

    const familySecurityAlert = await buildSecurityAlert(family.trips.map((t) => t.passenger));

    const boardable = family.trips.filter((t) => t.status === "ACTIVE");
    if (boardable.length === 0) {
      const anyBoarded = family.trips.some((t) => t.status === "BOARDED");
      if (anyBoarded) {
        return res.status(409).json({
          message: "This family has already been checked in",
          family,
          isFamily: true,
          alreadyBoarded: true,
          securityAlert: familySecurityAlert,
        });
      }
      return res.status(409).json({
        message: "This family booking cannot board (cancelled or no-show)",
        family,
        isFamily: true,
        securityAlert: familySecurityAlert,
      });
    }

    const capacity = family.trips[0].ship.capacity;
    const { boardedCount: currentBoarded } = await boardCounts(family.trips[0].scheduleId);
    if (currentBoarded + boardable.length > capacity) {
      await logAudit(
        req,
        GATE_SCAN_ACTION,
        `Family master code ${code} — rejected, ${family.trips[0].ship.name} at capacity (${currentBoarded}/${capacity})`
      );
      return res.status(409).json({
        message: `${family.trips[0].ship.name} does not have enough remaining capacity to board all ${boardable.length} family member(s) (${currentBoarded}/${capacity} already boarded).`,
        family,
        isFamily: true,
        capacityFull: true,
        boardedCount: currentBoarded,
        capacity,
      });
    }

    const now = new Date();
    await prisma.$transaction(
      boardable.map((t) =>
        prisma.trip.update({
          where: { id: t.id },
          data: { status: "BOARDED", boardedAt: now, statusUpdatedAt: now },
        })
      )
    );

    const updatedTrips = await prisma.trip.findMany({
      where: { familyBookingId: family.id },
      include: { passenger: true, ship: true, schedule: true },
      orderBy: { createdAt: "asc" },
    });

    const { boardedCount, totalBooked } = await boardCounts(updatedTrips[0].scheduleId);

    await logAudit(
      req,
      GATE_SCAN_ACTION,
      `Family master code ${code} verified — ${family.headFullName} & Family (${boardable.length} member(s) boarded)`
    );
    if (familySecurityAlert) {
      await logAudit(
        req,
        "WATCHLIST_ALERT",
        `Security watchlist match on family ${code}: ${familySecurityAlert.passengerName} — ${familySecurityAlert.reason}`
      );
    }

    return res.json({
      isFamily: true,
      familyBooking: family,
      trips: updatedTrips,
      justBoardedCount: boardable.length,
      boardedCount,
      totalBooked,
      capacity: updatedTrips[0].ship.capacity,
      securityAlert: familySecurityAlert,
    });
  }

  const trip = await prisma.trip.findUnique({
    where: { passNumber: code },
    include: { passenger: true, ship: true, schedule: true },
  });

  if (!trip) {
    await logAudit(req, GATE_SCAN_ACTION, `Ticket ${code} not found — scan rejected`);
    return res.status(404).json({ message: "Ticket not found" });
  }

  const securityAlert = await buildSecurityAlert([trip.passenger]);

  if (trip.status === "BOARDED") {
    await logAudit(req, GATE_SCAN_ACTION, `Ticket ${code} (${trip.passenger.fullName}) — duplicate scan, already boarded`);
    return res.status(409).json({ message: "This passenger is already checked in", trip, alreadyBoarded: true, securityAlert });
  }

  if (NOT_BOARDABLE.includes(trip.status)) {
    await logAudit(
      req,
      GATE_SCAN_ACTION,
      `Ticket ${code} (${trip.passenger.fullName}) — rejected, booking is ${trip.status.toLowerCase()}`
    );
    return res.status(409).json({
      message: `This booking is ${trip.status.toLowerCase().replace("_", "-")} and cannot board`,
      trip,
      securityAlert,
    });
  }

  const { boardedCount: currentBoarded } = await boardCounts(trip.scheduleId);
  if (currentBoarded >= trip.ship.capacity) {
    await logAudit(
      req,
      GATE_SCAN_ACTION,
      `Ticket ${code} (${trip.passenger.fullName}) — rejected, ${trip.ship.name} at full capacity (${currentBoarded}/${trip.ship.capacity})`
    );
    return res.status(409).json({
      message: `${trip.ship.name} is at full capacity (${currentBoarded}/${trip.ship.capacity}). Cannot board additional passengers.`,
      trip,
      capacityFull: true,
      boardedCount: currentBoarded,
      capacity: trip.ship.capacity,
      securityAlert,
    });
  }

  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: { status: "BOARDED", boardedAt: new Date(), statusUpdatedAt: new Date() },
    include: { passenger: true, ship: true, schedule: true },
  });

  const { boardedCount, totalBooked } = await boardCounts(updated.scheduleId);

  await logAudit(req, GATE_SCAN_ACTION, `Ticket ${code} (${trip.passenger.fullName}) verified — boarded on ${updated.ship.name}`);
  if (securityAlert) {
    await logAudit(
      req,
      "WATCHLIST_ALERT",
      `Security watchlist match on ticket ${code}: ${securityAlert.passengerName} — ${securityAlert.reason}`
    );
  }

  res.json({ trip: updated, boardedCount, totalBooked, capacity: updated.ship.capacity, securityAlert });
}

async function getRecentActivity(req, res) {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const rows = await prisma.auditLog.findMany({
    where: { action: GATE_SCAN_ACTION },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({ rows });
}

async function getBoardingAnalytics(req, res) {
  const { scheduleId } = req.query;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const where = scheduleId
    ? { scheduleId, status: { in: OCCUPYING_STATUSES } }
    : { status: { in: OCCUPYING_STATUSES }, createdAt: { gte: todayStart } };

  const [trips, scanLogs] = await Promise.all([
    prisma.trip.findMany({ where, include: { passenger: true } }),
    prisma.auditLog.findMany({
      where: { action: GATE_SCAN_ACTION, createdAt: { gte: todayStart } },
      select: { createdAt: true },
    }),
  ]);

  const totalBooked = trips.length;
  const boardedCount = trips.filter((t) => t.status === "BOARDED").length;
  const pendingCount = totalBooked - boardedCount;
  const boardedPct = totalBooked ? Math.round((boardedCount / totalBooked) * 100) : 0;

  const priorityCounts = { senior: 0, pwd: 0, pregnant: 0 };
  for (const t of trips) {
    if (t.passenger.isSeniorCitizen) priorityCounts.senior += 1;
    if (t.passenger.isPWD) priorityCounts.pwd += 1;
    if (t.passenger.isPregnant) priorityCounts.pregnant += 1;
  }

  const hourCounts = Array.from({ length: 24 }, () => 0);
  for (const log of scanLogs) hourCounts[new Date(log.createdAt).getHours()] += 1;
  const hourlyScanRate = hourCounts.map((count, hour) => ({ hour, count }));

  res.json({ totalBooked, boardedCount, pendingCount, boardedPct, priorityCounts, hourlyScanRate });
}

async function exportBoardingAuditManifest(req, res) {
  const { scheduleId } = req.query;
  if (!scheduleId) return res.status(400).json({ message: "scheduleId is required" });

  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId }, include: { ship: true } });
  if (!schedule) return res.status(404).json({ message: "Schedule not found" });

  const trips = await prisma.trip.findMany({
    where: { scheduleId, status: { in: OCCUPYING_STATUSES } },
    include: { passenger: true },
    orderBy: [{ status: "asc" }, { boardedAt: "asc" }],
  });
  const boardedTrips = trips.filter((t) => t.status === "BOARDED");
  const pendingCount = trips.length - boardedTrips.length;

  const scanLogs = await prisma.auditLog.findMany({
    where: { action: GATE_SCAN_ACTION },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  function findOperator(trip) {
    const log = scanLogs.find((l) => l.details && l.details.includes(trip.passNumber));
    return log ? log.adminName || log.adminEmail || "Unknown Operator" : trip.status === "BOARDED" ? "Unrecorded" : "—";
  }

  function priorityFlags(passenger) {
    const flags = [];
    if (passenger.isSeniorCitizen) flags.push("Senior");
    if (passenger.isPWD) flags.push("PWD");
    if (passenger.isPregnant) flags.push("Pregnant");
    return flags.join("; ") || "—";
  }

  const columns = [
    { label: "Pass Number", value: (t) => t.passNumber },
    { label: "Passenger Name", value: (t) => t.passenger.fullName },
    { label: "Status", value: (t) => t.status },
    { label: "QR Scan Timestamp", value: (t) => (t.boardedAt ? new Date(t.boardedAt).toISOString() : "") },
    { label: "Gate Operator", value: (t) => findOperator(t) },
    { label: "Priority Flags", value: (t) => priorityFlags(t.passenger) },
  ];

  const header = [
    "# PORTGO Boarding Audit Manifest",
    `# Vessel: ${schedule.ship.name}`,
    `# Voyage No.: ${schedule.voyageNumber || "N/A"}`,
    `# Route: ${schedule.route}`,
    `# Departure: ${schedule.departureTime}`,
    `# Boarded / Booked / Capacity: ${boardedTrips.length} / ${trips.length} / ${schedule.ship.capacity}`,
    `# Pending Boarding: ${pendingCount}`,
    `# PCG Departure Clearance: ${
      pendingCount === 0 ? "CLEARED - all booked passengers boarded" : "NOT CLEARED - passengers still pending"
    }`,
    `# Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  const csv = toCsv(trips, columns);
  const filename = `boarding-audit-manifest-${schedule.ship.name.replace(/\s+/g, "-")}-${scheduleId}.csv`;

  await logAudit(
    req,
    "BOARDING_MANIFEST_EXPORTED",
    `Exported boarding audit manifest for ${schedule.ship.name} (${schedule.departureTime}) — ${boardedTrips.length}/${trips.length} boarded`
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(header + csv);
}

module.exports = { scan, getRecentActivity, getBoardingAnalytics, exportBoardingAuditManifest };
