const prisma = require("../lib/prisma");
const { toCsv } = require("../utils/csv");
const { generatePassNumber, generateQrDataUrl } = require("../lib/qrcode");
const { logAudit } = require("../lib/audit");
const { resolveRange } = require("../lib/dateRange");

const PRIORITY_FIELD_MAP = {
  SENIOR: "isSeniorCitizen",
  PWD: "isPWD",
  PREGNANT: "isPregnant",
  WHEELCHAIR: "needsWheelchair",
  STUDENT: "isStudent",
  INFANT: "isInfant",
  MEDICAL: "isMedicalEmergency",
};

function buildWhere(query) {
  const {
    search,
    date,
    range,
    shipId,
    scheduleId,
    passengerType,
    transactionType,
    accommodationClass,
    status,
    priority,
    refundRequested,
  } = query;
  const where = {};
  const passengerWhere = {};

  if (shipId) where.shipId = shipId;
  if (scheduleId) where.scheduleId = scheduleId;
  if (transactionType) where.transactionType = transactionType;
  if (accommodationClass) where.accommodationClass = accommodationClass;
  if (status) where.status = status;
  if (refundRequested === "true") {
    where.refundRequested = true;
    where.refundProcessed = false;
  }

  if (range) {
    const r = resolveRange({ range });
    where.createdAt = { gte: r.start, lt: r.end };
  } else if (date) {
    const start = new Date(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  if (passengerType) passengerWhere.passengerType = passengerType;

  if (priority === "MINOR") {
    passengerWhere.age = { lt: 18 };
  } else if (priority && PRIORITY_FIELD_MAP[priority]) {
    passengerWhere[PRIORITY_FIELD_MAP[priority]] = true;
  }

  if (Object.keys(passengerWhere).length > 0) where.passenger = passengerWhere;

  if (search) {
    where.OR = [
      { passNumber: { contains: search } },
      { passenger: { fullName: { contains: search } } },
      { passenger: { contactNumber: { contains: search } } },
      { passenger: { passportNumber: { contains: search } } },
    ];
  }

  return where;
}

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  const where = buildWhere(req.query);

  const [rows, total, localCount, touristCount, departedCount, arrivedCount, priorityCount] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: { passenger: true, ship: true, schedule: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trip.count({ where }),
    prisma.trip.count({ where: { ...where, passenger: { ...where.passenger, passengerType: { not: "FOREIGN_TOURIST" } } } }),
    prisma.trip.count({ where: { ...where, passenger: { ...where.passenger, passengerType: "FOREIGN_TOURIST" } } }),
    // Departed = Outbound (Sign In, traveling to Dapa/Siargao, leaving Surigao).
    prisma.trip.count({ where: { ...where, transactionType: "SIGN_IN" } }),
    // Arrived = Inbound (Sign Out, traveling to Surigao, arriving from Dapa/Siargao).
    prisma.trip.count({ where: { ...where, transactionType: "SIGN_OUT" } }),
    prisma.trip.count({
      where: { ...where, passenger: { ...where.passenger, OR: [{ isSeniorCitizen: true }, { isPWD: true }] } },
    }),
  ]);

  res.json({
    rows,
    total,
    page,
    pageSize,
    summary: {
      total,
      local: localCount,
      tourist: touristCount,
      departed: departedCount,
      arrived: arrivedCount,
      priority: priorityCount,
    },
  });
}

async function exportCsv(req, res) {
  const where = buildWhere(req.query);

  const rows = await prisma.trip.findMany({
    where,
    include: { passenger: true, ship: true, schedule: true },
    orderBy: { createdAt: "desc" },
  });

  const columns = [
    { label: "Pass Number", value: (r) => r.passNumber },
    { label: "Full Name", value: (r) => r.passenger.fullName },
    { label: "Age", value: (r) => (r.passenger.age != null ? r.passenger.age : "") },
    { label: "Contact Number", value: (r) => r.passenger.contactNumber },
    { label: "Email", value: (r) => r.passenger.email || "" },
    { label: "Email Verified", value: (r) => (r.passenger.email ? (r.passenger.isEmailVerified ? "Yes" : "No") : "") },
    { label: "Emergency Contact Name", value: (r) => r.passenger.emergencyContactName || "" },
    { label: "Emergency Contact Number", value: (r) => r.passenger.emergencyContactPhone || "" },
    { label: "Passenger Type", value: (r) => r.passenger.passengerType },
    { label: "Passport Number", value: (r) => r.passenger.passportNumber || "" },
    { label: "ID Number", value: (r) => r.passenger.idNumber || "" },
    { label: "Gender", value: (r) => r.passenger.gender },
    { label: "Address", value: (r) => r.passenger.address },
    { label: "Direction", value: (r) => (r.transactionType === "SIGN_IN" ? "Outbound (Departing)" : "Inbound (Arriving)") },
    { label: "Accommodation Class", value: (r) => r.accommodationClass || "" },
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
    { label: "Transaction Type", value: (r) => r.transactionType },
    { label: "Purpose", value: (r) => r.purpose },
    { label: "Status", value: (r) => r.status },
    { label: "Ship", value: (r) => r.ship.name },
    { label: "Route", value: (r) => r.schedule.route },
    { label: "Departure Time", value: (r) => r.schedule.departureTime },
    { label: "Has Vehicle", value: (r) => (r.hasVehicle ? "Yes" : "No") },
    { label: "Vehicle Type", value: (r) => r.vehicleType || "" },
    { label: "Plate Number", value: (r) => r.plateNumber || "" },
    { label: "Created At", value: (r) => r.createdAt.toISOString() },
  ];

  const csv = toCsv(rows, columns);
  const filename = `portgo-records-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status, reason } = req.body;

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  if (["CANCELLED", "NO_SHOW"].includes(trip.status)) {
    return res.status(400).json({ message: `This booking is already ${trip.status.toLowerCase().replace("_", "-")}` });
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      status,
      statusReason: reason || null,
      statusUpdatedAt: new Date(),
    },
    include: { passenger: true, ship: true, schedule: true },
  });

  await logAudit(
    req,
    `TRIP_${status}`,
    `${updated.passenger.fullName} (${updated.passNumber}) marked ${status.replace("_", "-")}${reason ? ` — ${reason}` : ""}`
  );

  res.json({ trip: updated });
}

async function rebook(req, res) {
  const { id } = req.params;
  const { scheduleId } = req.body;

  const trip = await prisma.trip.findUnique({ where: { id }, include: { passenger: true } });
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (["CANCELLED", "NO_SHOW", "REBOOKED"].includes(trip.status)) {
    return res.status(400).json({ message: "This booking can no longer be rebooked" });
  }

  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || !schedule.active) {
    return res.status(400).json({ message: "Selected schedule is not available" });
  }
  if (schedule.status !== "ACTIVE") {
    return res.status(400).json({ message: "Selected schedule is currently cancelled" });
  }

  let newTrip = null;
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const passNumber = generatePassNumber();
    const qrCodeData = await generateQrDataUrl({
      passNumber,
      passengerName: trip.passenger.fullName,
      transactionType: trip.transactionType,
      schedule: schedule.departureTime,
      route: schedule.route,
      issuedAt: new Date().toISOString(),
      rebookedFrom: trip.passNumber,
    });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const created = await tx.trip.create({
          data: {
            passNumber,
            qrCodeData,
            transactionType: trip.transactionType,
            purpose: trip.purpose,
            hasVehicle: trip.hasVehicle,
            vehicleType: trip.vehicleType,
            plateNumber: trip.plateNumber,
            passengerId: trip.passengerId,
            shipId: schedule.shipId,
            scheduleId: schedule.id,
          },
          include: { passenger: true, ship: true, schedule: true },
        });
        await tx.trip.update({
          where: { id: trip.id },
          data: {
            status: "REBOOKED",
            statusReason: `Rebooked to ${passNumber}`,
            statusUpdatedAt: new Date(),
            rebookedToTripId: created.id,
          },
        });
        return created;
      });
      newTrip = result;
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!newTrip) throw lastError || new Error("Failed to rebook passenger");

  await logAudit(
    req,
    "TRIP_REBOOKED",
    `${newTrip.passenger.fullName} rebooked from ${trip.passNumber} to ${newTrip.passNumber}`
  );

  res.status(201).json({ trip: newTrip });
}

async function markRefundProcessed(req, res) {
  const { id } = req.params;

  const trip = await prisma.trip.findUnique({ where: { id }, include: { passenger: true } });
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (!trip.refundRequested) {
    return res.status(400).json({ message: "This booking was not flagged for a refund" });
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: { refundProcessed: true, refundProcessedAt: new Date() },
    include: { passenger: true, ship: true, schedule: true },
  });

  await logAudit(req, "REFUND_PROCESSED", `PPA refund marked processed for ${trip.passenger.fullName} (${trip.passNumber})`);

  res.json({ trip: updated });
}

module.exports = { list, exportCsv, updateStatus, rebook, markRefundProcessed };
