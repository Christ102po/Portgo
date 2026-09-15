const prisma = require("../lib/prisma");
const { getBookedCounts, getBookedCount } = require("../lib/capacity");
const { logAudit } = require("../lib/audit");
const { generatePassNumber, generateQrDataUrl } = require("../lib/qrcode");

const KIOSK_VISIBLE_STATUSES = ["ACTIVE", "DELAYED"];
const OCCUPYING_STATUSES = ["ACTIVE", "BOARDED"];
const ACCOMMODATION_CLASSES = ["ECONOMY", "TOURIST_AIRCON", "BUSINESS"];

async function list(req, res) {
  const { shipId, route, all } = req.query;
  const where = {
    ...(all === "1" ? {} : { active: true, status: { in: KIOSK_VISIBLE_STATUSES } }),
    ...(shipId ? { shipId } : {}),
    ...(route ? { route } : {}),
  };
  const schedules = await prisma.schedule.findMany({
    where,
    include: { ship: { include: { classes: true } } },
    orderBy: { departureTime: "asc" },
  });

  const scheduleIds = schedules.map((s) => s.id);
  const bookedCounts = await getBookedCounts(scheduleIds);

  const boardedGroups = scheduleIds.length
    ? await prisma.trip.groupBy({
        by: ["scheduleId"],
        where: { scheduleId: { in: scheduleIds }, status: "BOARDED" },
        _count: { _all: true },
      })
    : [];
  const boardedCounts = new Map(boardedGroups.map((g) => [g.scheduleId, g._count._all]));

  const classGroups = scheduleIds.length
    ? await prisma.trip.groupBy({
        by: ["scheduleId", "accommodationClass"],
        where: { scheduleId: { in: scheduleIds }, status: { in: OCCUPYING_STATUSES }, accommodationClass: { not: null } },
        _count: { _all: true },
      })
    : [];
  const classBookedByschedule = new Map();
  for (const g of classGroups) {
    if (!classBookedByschedule.has(g.scheduleId)) classBookedByschedule.set(g.scheduleId, new Map());
    classBookedByschedule.get(g.scheduleId).set(g.accommodationClass, g._count._all);
  }

  const enriched = schedules.map((s) => {
    const bookedCount = bookedCounts.get(s.id) || 0;
    const boardedCount = boardedCounts.get(s.id) || 0;
    const capacity = s.ship.capacity;
    const classBooked = classBookedByschedule.get(s.id) || new Map();
    const configuredClasses = [...s.ship.classes].sort(
      (a, b) => ACCOMMODATION_CLASSES.indexOf(a.className) - ACCOMMODATION_CLASSES.indexOf(b.className)
    );

    // No ShipClass rows means the vessel is Economy-only. If the admin
    // configured accommodation types, expose only those configured types to
    // the kiosk instead of inventing Economy/Tourist/Business options.
    const classAvailability = configuredClasses.length
      ? configuredClasses.map((configured) => {
          const booked = classBooked.get(configured.className) || 0;
          return {
            className: configured.className,
            capacity: configured.capacity,
            bookedCount: booked,
            seatsLeft: Math.max(0, configured.capacity - booked),
            isFull: booked >= configured.capacity,
          };
        })
      : [
          {
            className: "ECONOMY",
            capacity,
            bookedCount,
            seatsLeft: Math.max(0, capacity - bookedCount),
            isFull: bookedCount >= capacity,
            economyOnly: true,
          },
        ];
    return {
      ...s,
      bookedCount,
      boardedCount,
      pendingCount: Math.max(0, bookedCount - boardedCount),
      capacity,
      seatsLeft: Math.max(0, capacity - bookedCount),
      isFull: bookedCount >= capacity,
      classAvailability,
    };
  });

  res.json({ schedules: enriched });
}

async function create(req, res) {
  const { route, departureTime, daysOfWeek, shipId, voyageNumber, gateNumber, active } = req.body;
  if (!route || !departureTime || !daysOfWeek || !shipId) {
    return res.status(400).json({ message: "route, departureTime, daysOfWeek and shipId are required" });
  }
  const schedule = await prisma.schedule.create({
    data: {
      route,
      departureTime,
      daysOfWeek,
      shipId,
      voyageNumber: voyageNumber || null,
      gateNumber: gateNumber || null,
      ...(active !== undefined ? { active } : {}),
    },
  });
  await logAudit(req, "SCHEDULE_CREATED", `Created schedule ${departureTime} (${route}) for ship ${shipId}`);
  res.status(201).json({ schedule });
}

async function update(req, res) {
  const { id } = req.params;
  const { route, departureTime, daysOfWeek, shipId, voyageNumber, gateNumber, active } = req.body;
  const schedule = await prisma.schedule.update({
    where: { id },
    data: {
      ...(route !== undefined ? { route } : {}),
      ...(departureTime !== undefined ? { departureTime } : {}),
      ...(daysOfWeek !== undefined ? { daysOfWeek } : {}),
      ...(shipId !== undefined ? { shipId } : {}),
      ...(voyageNumber !== undefined ? { voyageNumber } : {}),
      ...(gateNumber !== undefined ? { gateNumber } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });
  await logAudit(req, "SCHEDULE_UPDATED", `Updated schedule ${schedule.departureTime} (${schedule.id})`);
  res.json({ schedule });
}

async function remove(req, res) {
  const { id } = req.params;
  const schedule = await prisma.schedule.findUnique({ where: { id }, include: { ship: true } });
  if (!schedule) return res.status(404).json({ message: "Schedule not found" });

  const tripCount = await prisma.trip.count({ where: { scheduleId: id } });
  if (tripCount > 0) {
    return res.status(409).json({
      code: "SCHEDULE_HAS_RECORDS",
      message: `This schedule has ${tripCount} passenger record${tripCount === 1 ? "" : "s"} and cannot be permanently deleted. Set it to Unavailable instead so historical records remain intact.`,
    });
  }

  await prisma.schedule.delete({ where: { id } });
  await logAudit(
    req,
    "SCHEDULE_DELETED",
    `Permanently deleted unused schedule ${schedule.departureTime} (${schedule.id}) for ${schedule.ship?.name || "ship"}`
  );
  res.json({ deleted: true, id });
}

async function reassignTrip(trip, targetSchedule) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const passNumber = generatePassNumber();
    const qrCodeData = await generateQrDataUrl({
      passNumber,
      passengerName: trip.passenger.fullName,
      transactionType: trip.transactionType,
      schedule: targetSchedule.departureTime,
      route: targetSchedule.route,
      issuedAt: new Date().toISOString(),
      reassignedFrom: trip.passNumber,
    });
    try {
      return await prisma.$transaction(async (tx) => {
        const created = await tx.trip.create({
          data: {
            passNumber,
            qrCodeData,
            transactionType: trip.transactionType,
            purpose: trip.purpose,
            hasVehicle: trip.hasVehicle,
            vehicleType: trip.vehicleType,
            plateNumber: trip.plateNumber,
            accommodationClass: trip.accommodationClass,
            passengerId: trip.passengerId,
            shipId: targetSchedule.shipId,
            scheduleId: targetSchedule.id,
          },
        });
        await tx.trip.update({
          where: { id: trip.id },
          data: {
            status: "REBOOKED",
            statusReason: `Batch-reassigned due to schedule cancellation to ${targetSchedule.departureTime}`,
            statusUpdatedAt: new Date(),
            rebookedToTripId: created.id,
          },
        });
        return created;
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to reassign trip");
}

async function cancel(req, res) {
  const { id } = req.params;
  const { category, reason, reassignToScheduleId, markForRefund } = req.body;

  const schedule = await prisma.schedule.findUnique({ where: { id }, include: { ship: true } });
  if (!schedule) return res.status(404).json({ message: "Schedule not found" });

  let targetSchedule = null;
  if (reassignToScheduleId) {
    targetSchedule = await prisma.schedule.findUnique({
      where: { id: reassignToScheduleId },
      include: { ship: true },
    });
    if (!targetSchedule || !targetSchedule.active || targetSchedule.status !== "ACTIVE") {
      return res.status(400).json({ message: "Target schedule is not available for reassignment" });
    }
    if (targetSchedule.id === id) {
      return res.status(400).json({ message: "Cannot reassign passengers to the same schedule being cancelled" });
    }

    const affectedCount = await prisma.trip.count({ where: { scheduleId: id, status: "ACTIVE" } });
    const targetBooked = await getBookedCount(targetSchedule.id);
    const remainingCapacity = targetSchedule.ship.capacity - targetBooked;
    if (affectedCount > remainingCapacity) {
      return res.status(400).json({
        message: `${targetSchedule.ship.name} at ${targetSchedule.departureTime} only has ${Math.max(
          0,
          remainingCapacity
        )} seat(s) remaining — not enough room for all ${affectedCount} affected passenger(s). Choose a sailing with more capacity.`,
      });
    }
  }

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      status: category,
      cancellationReason: reason,
      cancelledAt: new Date(),
      delayMinutes: null,
      delayReason: null,
      delayedAt: null,
    },
  });

  const affectedTrips = await prisma.trip.findMany({
    where: { scheduleId: id, status: "ACTIVE" },
    include: { passenger: true },
  });

  let reassignedCount = 0;
  let refundCount = 0;

  if (targetSchedule) {
    for (const trip of affectedTrips) {
      try {
        await reassignTrip(trip, targetSchedule);
        reassignedCount += 1;
      } catch (err) {
        console.error(`Failed to reassign trip ${trip.id}:`, err.message);
      }
    }
  } else {
    const now = new Date();
    const { count } = await prisma.trip.updateMany({
      where: { scheduleId: id, status: "ACTIVE" },
      data: {
        status: "CANCELLED",
        statusReason: `Schedule cancelled: ${reason}`,
        statusUpdatedAt: now,
        ...(markForRefund ? { refundRequested: true, refundRequestedAt: now } : {}),
      },
    });
    refundCount = markForRefund ? count : 0;
  }

  await logAudit(
    req,
    "SCHEDULE_CANCELLED",
    `Cancelled ${schedule.ship.name} sailing at ${schedule.departureTime} (${category}) — ${reason}. ` +
      (targetSchedule
        ? `${reassignedCount} of ${affectedTrips.length} passenger(s) batch-reassigned to ${targetSchedule.departureTime}.`
        : `${affectedTrips.length} booking(s) cancelled${
            markForRefund ? `, ${refundCount} flagged for PPA refund processing` : ""
          }.`)
  );

  res.json({
    schedule: updated,
    affectedTrips: affectedTrips.length,
    reassignedCount,
    refundCount,
  });
}

async function delay(req, res) {
  const { id } = req.params;
  const { minutes, reason } = req.body;

  const schedule = await prisma.schedule.findUnique({ where: { id }, include: { ship: true } });
  if (!schedule) return res.status(404).json({ message: "Schedule not found" });

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      status: "DELAYED",
      delayMinutes: minutes,
      delayReason: reason,
      delayedAt: new Date(),
    },
  });

  await logAudit(
    req,
    "SCHEDULE_DELAYED",
    `${schedule.ship.name} sailing at ${schedule.departureTime} delayed +${minutes} min — ${reason}`
  );

  res.json({ schedule: updated });
}

async function maintenance(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  const schedule = await prisma.schedule.findUnique({ where: { id }, include: { ship: true } });
  if (!schedule) return res.status(404).json({ message: "Schedule not found" });

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      status: "MAINTENANCE",
      cancellationReason: reason || null,
      cancelledAt: new Date(),
    },
  });

  await logAudit(
    req,
    "SCHEDULE_MAINTENANCE",
    `${schedule.ship.name} sailing at ${schedule.departureTime} set under maintenance — hidden from kiosk. Existing bookings untouched.`
  );

  res.json({ schedule: updated });
}

async function reactivate(req, res) {
  const { id } = req.params;
  const schedule = await prisma.schedule.update({
    where: { id },
    data: {
      status: "ACTIVE",
      cancellationReason: null,
      cancelledAt: null,
      delayMinutes: null,
      delayReason: null,
      delayedAt: null,
    },
  });
  await logAudit(req, "SCHEDULE_REACTIVATED", `Reactivated schedule ${schedule.departureTime} (${schedule.id})`);
  res.json({ schedule });
}

module.exports = { list, create, update, remove, cancel, delay, maintenance, reactivate };
