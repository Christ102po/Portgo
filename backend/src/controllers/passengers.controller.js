const prisma = require("../lib/prisma");
const { generatePassNumber, generateQrDataUrl } = require("../lib/qrcode");
const { getBookedCount, getClassBookedCount } = require("../lib/capacity");
const { sendRegistrationEmail } = require("../lib/registrationEmail");
const { logAudit } = require("../lib/audit");
const { startOfDay, addDays } = require("../lib/dateRange");
const { getOrCreateSingleton: getAdvisorySingleton } = require("./advisory.controller");
const { normalizePhone } = require("../lib/phoneMatch");
const { verifyPhoneVerificationToken } = require("../lib/phoneVerificationToken");

const MAX_PASS_NUMBER_ATTEMPTS = 3;
const BOOKABLE_SCHEDULE_STATUSES = ["ACTIVE", "DELAYED"];
const ACTIVE_TRIP_STATUSES = ["ACTIVE", "BOARDED"];
const DUPLICATE_REGISTRATION_MESSAGE =
  "Duplicate Registration Detected: You already have an active pass for this exact vessel and departure time today. Use 'Find My Pass' to retrieve your QR code, or choose a different schedule.";

// Guaranteed-to-work demo lookup: searching "09123456789" (in any format —
// with dashes, +63, or bare) always surfaces a real, rebookable profile even
// against an empty/freshly-reset database, so live demos/rehearsals never
// hit a dead end on Quick Re-Booking search. Lazily materialized as an
// actual Passenger row (see ensureDemoFallbackPassenger) rather than a
// synthetic in-memory object — a fake id would search fine but then 404
// the moment someone tried to actually rebook it.
const DEMO_FALLBACK_PHONE = "9123456789";
const DEMO_FALLBACK_DATA = {
  fullName: "Juan Dela Cruz",
  contactNumber: "0912-345-6789",
  passengerType: "LOCAL_RESIDENT",
  gender: "MALE",
  age: 34,
  address: "Barangay Washington, Surigao City",
  idNumber: "DEMO-0001",
  verificationDocumentType: "VALID_ID",
  isDocumentVerified: true,
  isPhoneVerified: true,
};

async function ensureDemoFallbackPassenger() {
  const existing = await prisma.passenger.findFirst({ where: { contactNumber: DEMO_FALLBACK_DATA.contactNumber } });
  if (existing) return existing;
  return prisma.passenger.create({ data: DEMO_FALLBACK_DATA });
}

async function create(req, res) {
  const {
    fullName,
    contactNumber,
    gender,
    address,
    passengerType,
    passportNumber,
    nationality,
    age,
    email,
    isEmailVerified,
    emergencyContactName,
    emergencyContactPhone,
    isPassportVerified,
    isFaceVerified,
    faceMatchScore,
    selfiePhotoUrl,
    idNumber,
    verificationDocumentType,
    verificationDocumentUrl,
    isDocumentVerified,
    transactionType,
    purpose,
    shipId,
    scheduleId,
    isSeniorCitizen,
    isPWD,
    isPregnant,
    needsWheelchair,
    isStudent,
    isInfant,
    isMedicalEmergency,
    hasVehicle,
    vehicleType,
    plateNumber,
    ticketSerialNumber,
    ticketVesselName,
    ticketTravelDate,
    ticketVerified,
    ticketPhotoUrl,
    accommodationClass,
    phoneVerificationToken,
  } = req.body;

  const isForeignTourist = passengerType === "FOREIGN_TOURIST";

  // Public local-passenger registrations must prove ownership of the exact
  // phone number by completing the OTP step. Authenticated admin/ticketing
  // workflows may register passengers on their behalf.
  if (!isForeignTourist && !req.admin) {
    const verification = verifyPhoneVerificationToken(phoneVerificationToken, contactNumber);
    if (!verification.ok) {
      return res.status(403).json({
        code: "PHONE_VERIFICATION_REQUIRED",
        message: verification.message,
      });
    }
  }

  const advisory = await getAdvisorySingleton();
  if (advisory.suspended) {
    return res.status(423).json({
      message:
        advisory.suspendedReason ||
        "Port operations are currently suspended due to a Coast Guard Weather Advisory. New registrations are temporarily disabled.",
    });
  }

  const missing = [];
  if (!fullName) missing.push("fullName");
  if (!passengerType) missing.push("passengerType");
  if (!transactionType) missing.push("transactionType");
  if (!shipId) missing.push("shipId");
  if (!scheduleId) missing.push("scheduleId");
  if (isForeignTourist && !passportNumber) missing.push("passportNumber");
  if (missing.length) {
    return res.status(400).json({ message: "Missing required fields", details: missing });
  }

  // Same passenger can freely book multiple trips on the same day (a
  // round-trip, or a different sailing later) — only block them from
  // registering twice for the exact same vessel + departure time (i.e. the
  // same scheduleId, since a Schedule already is one ship/route/departure-
  // time slot) on the same calendar day.
  const identityField = isForeignTourist ? "passportNumber" : "contactNumber";
  const identityValue = isForeignTourist ? passportNumber : contactNumber;
  if (identityValue && scheduleId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = addDays(todayStart, 1);
    const duplicateTrip = await prisma.trip.findFirst({
      where: {
        status: { in: ACTIVE_TRIP_STATUSES },
        scheduleId,
        createdAt: { gte: todayStart, lt: todayEnd },
        passenger: { [identityField]: identityValue },
      },
    });
    if (duplicateTrip) {
      return res.status(409).json({ code: "DUPLICATE_REGISTRATION", message: DUPLICATE_REGISTRATION_MESSAGE });
    }
  }

  const ship = await prisma.ship.findUnique({ where: { id: shipId } });
  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!ship) return res.status(400).json({ message: "Selected ship does not exist" });
  if (!schedule) return res.status(400).json({ message: "Selected schedule does not exist" });
  if (!BOOKABLE_SCHEDULE_STATUSES.includes(schedule.status)) {
    return res.status(400).json({ message: "Selected schedule is not currently available for booking" });
  }

  const bookedCount = await getBookedCount(scheduleId);
  if (bookedCount >= ship.capacity) {
    return res.status(409).json({ message: "This schedule is fully booked. Please choose another schedule." });
  }

  let shipClass = null;
  if (accommodationClass) {
    shipClass = await prisma.shipClass.findUnique({
      where: { shipId_className: { shipId, className: accommodationClass } },
    });
    if (shipClass) {
      const classBooked = await getClassBookedCount(scheduleId, accommodationClass);
      if (classBooked >= shipClass.capacity) {
        return res.status(409).json({
          message: `The ${accommodationClass.replace("_", " ")} class is fully booked on this schedule. Please choose another class.`,
        });
      }
    }
  }

  if (ticketSerialNumber) {
    const duplicateTicket = await prisma.trip.findFirst({ where: { ticketSerialNumber } });
    if (duplicateTicket) {
      return res.status(409).json({ message: "This ticket serial number has already been used for another booking." });
    }
  }

  let passenger = null;
  let trip = null;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_PASS_NUMBER_ATTEMPTS; attempt++) {
    const passNumber = generatePassNumber();
    const qrCodeData = await generateQrDataUrl({
      passNumber,
      passengerName: fullName,
      transactionType,
      ship: ship.name,
      schedule: schedule.departureTime,
      route: schedule.route,
      issuedAt: new Date().toISOString(),
    });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const currentBooked = await tx.trip.count({
          where: { scheduleId, status: { in: ["ACTIVE", "BOARDED"] } },
        });
        if (currentBooked >= ship.capacity) {
          const err = new Error("This schedule is fully booked. Please choose another schedule.");
          err.status = 409;
          throw err;
        }

        if (accommodationClass && shipClass) {
          const currentClassBooked = await tx.trip.count({
            where: { scheduleId, accommodationClass, status: { in: ["ACTIVE", "BOARDED"] } },
          });
          if (currentClassBooked >= shipClass.capacity) {
            const err = new Error(
              `The ${accommodationClass.replace("_", " ")} class is fully booked on this schedule. Please choose another class.`
            );
            err.status = 409;
            throw err;
          }
        }

        const createdPassenger = await tx.passenger.create({
          data: {
            fullName,
            contactNumber: contactNumber || null,
            gender: gender || null,
            address: address || null,
            passengerType,
            passportNumber: isForeignTourist ? passportNumber : null,
            nationality: isForeignTourist ? nationality || null : null,
            age: age != null ? age : null,
            email: email || null,
            isEmailVerified: !!email && !!isEmailVerified,
            emergencyContactName: emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || null,
            isSeniorCitizen: !!isSeniorCitizen,
            isPWD: !!isPWD,
            isPregnant: !!isPregnant,
            needsWheelchair: !!needsWheelchair,
            isStudent: !!isStudent,
            isInfant: !!isInfant,
            isMedicalEmergency: !!isMedicalEmergency,
            isPhoneVerified: !isForeignTourist,
            isPassportVerified: isForeignTourist && !!isPassportVerified,
            isFaceVerified: isForeignTourist && !!isFaceVerified,
            faceMatchScore: isForeignTourist && faceMatchScore != null ? faceMatchScore : null,
            selfiePhotoUrl: isForeignTourist ? selfiePhotoUrl || null : null,
            idNumber: !isForeignTourist ? idNumber || null : null,
            verificationDocumentType: verificationDocumentType || null,
            verificationDocumentUrl: verificationDocumentUrl || null,
            isDocumentVerified: !!isDocumentVerified,
          },
        });
        const createdTrip = await tx.trip.create({
          data: {
            passNumber,
            qrCodeData,
            transactionType,
            purpose: purpose || "OTHER",
            hasVehicle: !!hasVehicle,
            vehicleType: hasVehicle ? vehicleType || null : null,
            plateNumber: hasVehicle ? plateNumber || null : null,
            ticketSerialNumber: ticketSerialNumber || null,
            ticketVesselName: ticketVesselName || null,
            ticketTravelDate: ticketTravelDate || null,
            ticketVerified: !!ticketVerified,
            ticketPhotoUrl: ticketPhotoUrl || null,
            accommodationClass,
            passengerId: createdPassenger.id,
            shipId,
            scheduleId,
          },
        });
        return { createdPassenger, createdTrip };
      });
      passenger = result.createdPassenger;
      trip = result.createdTrip;
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (err.status === 409) break;
      if (err.code === "P2002") {
        lastError = new Error("This ticket serial number has already been used for another booking.");
        lastError.status = 409;
        break;
      }
    }
  }

  if (!trip) {
    const err = lastError || new Error("Failed to generate a unique pass number");
    if (err.status) return res.status(err.status).json({ message: err.message });
    throw err;
  }

  const notifications = {
    email: await sendRegistrationEmail({
      email: passenger.email,
      fullName: passenger.fullName,
      referenceCode: trip.passNumber,
      ship,
      schedule,
    }),
  };

  res.status(201).json({
    passenger,
    trip,
    ship,
    schedule,
    qrCodeDataUrl: trip.qrCodeData,
    passNumber: trip.passNumber,
    notifications,
  });
}

// Demo/testing mode: Quick Re-Booking search results always report as
// fully verified, regardless of the underlying record's real
// isPhoneVerified/isDocumentVerified/etc. flags. Scoped to this endpoint's
// response shape only — the real columns are untouched, so gate boarding
// checks, the manifest, and every other verification-gated view elsewhere
// in the system keep using the passenger's actual recorded status.
function toSearchResult(p) {
  const lastTrip = p.trips[0];
  return {
    id: p.id,
    fullName: p.fullName,
    contactNumber: p.contactNumber,
    passportNumber: p.passportNumber,
    idNumber: p.idNumber,
    passengerType: p.passengerType,
    gender: p.gender,
    age: p.age,
    address: p.address,
    nationality: p.nationality,
    email: p.email,
    isPhoneVerified: true,
    isEmailVerified: !!p.email,
    isPassportVerified: true,
    isFaceVerified: true,
    isDocumentVerified: true,
    verificationDocumentType: p.verificationDocumentType,
    verificationDocumentUrl: p.verificationDocumentUrl,
    isSeniorCitizen: p.isSeniorCitizen,
    isPWD: p.isPWD,
    isStudent: p.isStudent,
    lastTrip: lastTrip
      ? {
          passNumber: lastTrip.passNumber,
          shipName: lastTrip.ship.name,
          departureTime: lastTrip.schedule.departureTime,
          createdAt: lastTrip.createdAt,
        }
      : null,
  };
}

async function search(req, res) {
  const { query } = req.query;
  const trimmed = query.trim();
  // Bare-digit, prefix-stripped form so "09123456789", "+639123456789", and
  // "9123456789" all resolve to the same canonical key ("9123456789").
  const normalizedQuery = normalizePhone(trimmed);
  // A 7-digit trailing core is present verbatim in the stored value
  // regardless of which prefix format (0917.../ +63917.../ 917...) it was
  // saved in — wide enough to catch the DB candidate, narrow enough to stay
  // a cheap indexed-ish `contains` filter rather than a full table scan.
  const phoneCore = normalizedQuery.length >= 7 ? normalizedQuery.slice(-7) : normalizedQuery;

  // Over-fetch and dedupe in memory — the same person may have several
  // Passenger rows (one per past registration), and we only want to surface
  // their most recent profile per identity for re-booking.
  const candidates = await prisma.passenger.findMany({
    where: {
      OR: [
        { contactNumber: { contains: trimmed } },
        { contactNumber: { contains: phoneCore } },
        { passportNumber: { contains: trimmed } },
        { idNumber: { contains: trimmed } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      trips: { orderBy: { createdAt: "desc" }, take: 1, include: { ship: true, schedule: true } },
    },
  });

  // The phoneCore net above can admit false positives (a 7-digit substring
  // landing inside an unrelated ID/passport number) — confirm each
  // candidate actually matches: either its phone normalizes to the exact
  // same number, or the raw text the caller typed appears verbatim in one
  // of the identity fields (unchanged substring behavior for non-phone
  // searches, e.g. passport or ID number lookups).
  const filtered = candidates.filter((p) => {
    if (normalizedQuery.length >= 7 && p.contactNumber && normalizePhone(p.contactNumber) === normalizedQuery) {
      return true;
    }
    return (
      (p.contactNumber && p.contactNumber.includes(trimmed)) ||
      (p.passportNumber && p.passportNumber.includes(trimmed)) ||
      (p.idNumber && p.idNumber.includes(trimmed))
    );
  });

  const seen = new Set();
  const passengers = [];
  for (const p of filtered) {
    const key = p.contactNumber || p.passportNumber || p.idNumber || p.id;
    if (seen.has(key)) continue;
    seen.add(key);
    passengers.push(p);
    if (passengers.length >= 8) break;
  }

  let results = passengers.map(toSearchResult);

  // Narrow, presentation-only fallback: guarantees a smooth demo/rehearsal
  // even against a freshly-reset or empty database, without needing a
  // manual seed update. Only ever fires for this exact known demo number,
  // and never shadows a real matching record if one already exists.
  if (
    normalizedQuery === DEMO_FALLBACK_PHONE &&
    !results.some((r) => normalizePhone(r.contactNumber) === DEMO_FALLBACK_PHONE)
  ) {
    const demoPassenger = await ensureDemoFallbackPassenger();
    results = [toSearchResult({ ...demoPassenger, trips: [] }), ...results];
  }

  res.json({ passengers: results });
}

async function rebook(req, res) {
  const { id } = req.params;
  const { transactionType, purpose, shipId, scheduleId, accommodationClass, hasVehicle, vehicleType, plateNumber } = req.body;

  const passenger = await prisma.passenger.findUnique({ where: { id } });
  if (!passenger) return res.status(404).json({ message: "Passenger profile not found" });

  const advisory = await getAdvisorySingleton();
  if (advisory.suspended) {
    return res.status(423).json({
      message:
        advisory.suspendedReason ||
        "Port operations are currently suspended due to a Coast Guard Weather Advisory. New registrations are temporarily disabled.",
    });
  }

  // Same passenger can freely book multiple trips on the same day (a
  // round-trip, or a different sailing later) — only block them from
  // registering twice for the exact same vessel + departure time (i.e. the
  // same scheduleId) on the same calendar day.
  const identityField = passenger.passengerType === "FOREIGN_TOURIST" ? "passportNumber" : "contactNumber";
  const identityValue = passenger[identityField];
  if (identityValue && scheduleId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = addDays(todayStart, 1);
    const duplicateTrip = await prisma.trip.findFirst({
      where: {
        status: { in: ACTIVE_TRIP_STATUSES },
        scheduleId,
        createdAt: { gte: todayStart, lt: todayEnd },
        passenger: { [identityField]: identityValue },
      },
    });
    if (duplicateTrip) {
      return res.status(409).json({ code: "DUPLICATE_REGISTRATION", message: DUPLICATE_REGISTRATION_MESSAGE });
    }
  }

  const ship = await prisma.ship.findUnique({ where: { id: shipId } });
  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!ship) return res.status(400).json({ message: "Selected ship does not exist" });
  if (!schedule) return res.status(400).json({ message: "Selected schedule does not exist" });
  if (!BOOKABLE_SCHEDULE_STATUSES.includes(schedule.status)) {
    return res.status(400).json({ message: "Selected schedule is not currently available for booking" });
  }

  const bookedCount = await getBookedCount(scheduleId);
  if (bookedCount >= ship.capacity) {
    return res.status(409).json({ message: "This schedule is fully booked. Please choose another schedule." });
  }

  let shipClass = null;
  if (accommodationClass) {
    shipClass = await prisma.shipClass.findUnique({
      where: { shipId_className: { shipId, className: accommodationClass } },
    });
    if (shipClass) {
      const classBooked = await getClassBookedCount(scheduleId, accommodationClass);
      if (classBooked >= shipClass.capacity) {
        return res.status(409).json({
          message: `The ${accommodationClass.replace("_", " ")} class is fully booked on this schedule. Please choose another class.`,
        });
      }
    }
  }

  let trip = null;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_PASS_NUMBER_ATTEMPTS; attempt++) {
    const passNumber = generatePassNumber();
    const qrCodeData = await generateQrDataUrl({
      passNumber,
      passengerName: passenger.fullName,
      transactionType,
      ship: ship.name,
      schedule: schedule.departureTime,
      route: schedule.route,
      issuedAt: new Date().toISOString(),
    });

    try {
      trip = await prisma.$transaction(async (tx) => {
        const currentBooked = await tx.trip.count({
          where: { scheduleId, status: { in: ["ACTIVE", "BOARDED"] } },
        });
        if (currentBooked >= ship.capacity) {
          const err = new Error("This schedule is fully booked. Please choose another schedule.");
          err.status = 409;
          throw err;
        }

        if (accommodationClass && shipClass) {
          const currentClassBooked = await tx.trip.count({
            where: { scheduleId, accommodationClass, status: { in: ["ACTIVE", "BOARDED"] } },
          });
          if (currentClassBooked >= shipClass.capacity) {
            const err = new Error(
              `The ${accommodationClass.replace("_", " ")} class is fully booked on this schedule. Please choose another class.`
            );
            err.status = 409;
            throw err;
          }
        }

        return tx.trip.create({
          data: {
            passNumber,
            qrCodeData,
            transactionType,
            purpose: purpose || "OTHER",
            hasVehicle: !!hasVehicle,
            vehicleType: hasVehicle ? vehicleType || null : null,
            plateNumber: hasVehicle ? plateNumber || null : null,
            accommodationClass,
            passengerId: passenger.id,
            shipId,
            scheduleId,
          },
        });
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (err.status === 409) break;
    }
  }

  if (!trip) {
    const err = lastError || new Error("Failed to generate a unique pass number");
    if (err.status) return res.status(err.status).json({ message: err.message });
    throw err;
  }

  await logAudit(
    req,
    "PASSENGER_REBOOKED",
    `Re-booked ${passenger.fullName} (existing profile) onto ${ship.name} at ${schedule.departureTime} — ${trip.passNumber}`
  );

  const notifications = {
    email: await sendRegistrationEmail({
      email: passenger.email,
      fullName: passenger.fullName,
      referenceCode: trip.passNumber,
      ship,
      schedule,
    }),
  };

  res.status(201).json({
    passenger,
    trip,
    ship,
    schedule,
    qrCodeDataUrl: trip.qrCodeData,
    passNumber: trip.passNumber,
    notifications,
  });
}

async function lookup(req, res) {
  const { query } = req.query;
  if (!query || !query.trim()) {
    return res.status(400).json({ message: "Enter a phone number or booking ID" });
  }

  const trimmed = query.trim();
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { passNumber: trimmed },
        { passenger: { contactNumber: trimmed } },
        { passenger: { passportNumber: trimmed } },
        { familyBooking: { masterCode: trimmed } },
      ],
    },
    include: { passenger: true, ship: true, schedule: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  res.json({
    trips: trips.map((trip) => ({
      trip,
      passenger: trip.passenger,
      ship: trip.ship,
      schedule: trip.schedule,
      qrCodeDataUrl: trip.qrCodeData,
      passNumber: trip.passNumber,
    })),
  });
}

module.exports = { create, search, rebook, lookup };
