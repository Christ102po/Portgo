const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");
const { sendSms } = require("../lib/semaphore");

const DEFAULT_GALE_WARNING_SMS =
  "PORTGO ALERT: Philippine Coast Guard Gale Warning is now in effect. Trips may be delayed or suspended — please check with the port before heading out.";

async function getOrCreateSingleton() {
  const existing = await prisma.portAdvisory.findFirst({ orderBy: { updatedAt: "desc" } });
  if (existing) return existing;
  return prisma.portAdvisory.create({ data: { active: false } });
}

async function getAdvisory(req, res) {
  const advisory = await getOrCreateSingleton();
  res.json({ advisory });
}

async function updateAdvisory(req, res) {
  const { active, message, suspended, suspendedReason } = req.body;
  const current = await getOrCreateSingleton();

  const nextActive = active !== undefined ? active : current.active;
  const nextMessage = message !== undefined ? message : current.message;
  const nextSuspended = suspended !== undefined ? suspended : current.suspended;
  const nextSuspendedReason = suspendedReason !== undefined ? suspendedReason : current.suspendedReason;

  const advisory = await prisma.portAdvisory.update({
    where: { id: current.id },
    data: {
      active: nextActive,
      message: nextMessage ?? null,
      activatedAt: nextActive && !current.active ? new Date() : current.activatedAt,
      suspended: nextSuspended,
      suspendedReason: nextSuspendedReason ?? null,
      suspendedAt: nextSuspended && !current.suspended ? new Date() : current.suspendedAt,
      updatedBy: req.admin?.email || null,
    },
  });

  if (active !== undefined && active !== current.active) {
    await logAudit(
      req,
      active ? "ADVISORY_ACTIVATED" : "ADVISORY_CLEARED",
      active ? `Gale warning activated: ${message || "no message"}` : "Gale warning cleared"
    );
  }

  if (suspended !== undefined && suspended !== current.suspended) {
    await logAudit(
      req,
      suspended ? "OPERATIONS_SUSPENDED" : "OPERATIONS_RESUMED",
      suspended
        ? `Emergency No-Sail Suspension activated: ${suspendedReason || "no reason given"} — new registrations disabled`
        : "Operations resumed — new registrations re-enabled"
    );
  }

  res.json({ advisory });
}

async function cancelAllActiveSchedules(req, res) {
  const { reason } = req.body;

  const schedules = await prisma.schedule.findMany({ where: { status: "ACTIVE" } });

  let tripsCancelled = 0;
  for (const schedule of schedules) {
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { status: "CANCELLED_WEATHER", cancellationReason: reason, cancelledAt: new Date() },
    });
    const { count } = await prisma.trip.updateMany({
      where: { scheduleId: schedule.id, status: "ACTIVE" },
      data: {
        status: "CANCELLED",
        statusReason: `Schedule cancelled: ${reason}`,
        statusUpdatedAt: new Date(),
      },
    });
    tripsCancelled += count;
  }

  await logAudit(
    req,
    "BULK_SCHEDULE_CANCEL",
    `Bulk-cancelled ${schedules.length} active schedule(s), ${tripsCancelled} booking(s) affected — ${reason}`
  );

  res.json({ schedulesCancelled: schedules.length, tripsCancelled });
}

async function broadcastSms(req, res) {
  const { message } = req.body;
  const smsMessage = (message || DEFAULT_GALE_WARNING_SMS).slice(0, 300);

  const trips = await prisma.trip.findMany({
    where: { status: "ACTIVE", passenger: { contactNumber: { not: null } } },
    include: { passenger: true },
  });

  const recipients = new Map();
  for (const t of trips) {
    const phone = t.passenger.contactNumber;
    if (phone && !recipients.has(phone)) recipients.set(phone, t.passenger.fullName);
  }

  let sent = 0;
  let failed = 0;
  for (const phone of recipients.keys()) {
    const result = await sendSms(phone, smsMessage);
    if (result.ok) sent += 1;
    else failed += 1;
  }

  await logAudit(
    req,
    "ADVISORY_SMS_BROADCAST",
    `Sent Gale Warning SMS alert to ${sent} of ${recipients.size} passenger(s) with active bookings${
      failed ? ` — ${failed} failed` : ""
    }`
  );

  res.json({ total: recipients.size, sent, failed });
}

module.exports = { getAdvisory, updateAdvisory, cancelAllActiveSchedules, broadcastSms, getOrCreateSingleton };
