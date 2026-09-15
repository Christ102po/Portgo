const prisma = require("../lib/prisma");
const { generatePassNumber, generateQrDataUrl } = require("../lib/qrcode");
const { getBookedCount, getClassBookedCount } = require("../lib/capacity");
const { sendRegistrationEmail } = require("../lib/registrationEmail");
const { sendRegistrationSms } = require("../lib/registrationSms");
const { logAudit } = require("../lib/audit");
const { startOfDay, addDays } = require("../lib/dateRange");
const { getOrCreateSingleton: getAdvisorySingleton } = require("./advisory.controller");
const { normalizePhone } = require("../lib/phoneMatch");
const { parseTimeToMinutes } = require("../lib/timeOfDay");

const MAX_PASS_NUMBER_ATTEMPTS = 3;
const BOOKABLE_SCHEDULE_STATUSES = ["ACTIVE", "DELAYED"];
const ACTIVE_TRIP_STATUSES = ["ACTIVE", "BOARDED"];
const DUPLICATE_REGISTRATION_MESSAGE =
  "Duplicate Registration Detected: You already have an active pass for this exact vessel and departure time today. Use 'Find My Pass' to retrieve your QR code, or choose a different schedule.";

async function resolveAccommodationConfig(shipId, accommodationClass) {
  const configured = await prisma.shipClass.findMany({ where: { shipId } });
  if (configured.length === 0) {
    if (accommodationClass !== "ECONOMY") {
      const err = new Error("This vessel offers Economy seating only. Please select Economy.");
      err.status = 400;
      throw err;
    }
    return { shipClass: null, economyOnly: true };
  }

  const shipClass = configured.find((item) => item.className === accommodationClass) || null;
  if (!shipClass) {
    const err = new Error("The selected accommodation type is not offered by this vessel.");
    err.status = 400;
    throw err;
  }
  return { shipClass, economyOnly: false };
}

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

function randomGroupToken(length = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < length; i++) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

function generateGroupMasterCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `FAM-${y}${m}${d}-${randomGroupToken()}`;
}

async function createPrimaryWithMembers(req, res) {
  const data = req.body;
  const members = Array.isArray(data.members) ? data.members : [];
  const groupSize = 1 + members.length;
  const isForeignTourist = data.passengerType === "FOREIGN_TOURIST";

  if (isForeignTourist && !data.passportNumber) {
    return res.status(400).json({ message: "Missing required fields", details: ["passportNumber"] });
  }

  const advisory = await getAdvisorySingleton();
  if (advisory.suspended) {
    return res.status(423).json({
      message:
        advisory.suspendedReason ||
        "Port operations are currently suspended due to a Coast Guard Weather Advisory. New registrations are temporarily disabled.",
    });
  }

  const identityField = isForeignTourist ? "passportNumber" : "contactNumber";
  const identityValue = isForeignTourist ? data.passportNumber : data.contactNumber;
  if (identityValue && data.scheduleId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = addDays(todayStart, 1);
    const duplicateTrip = await prisma.trip.findFirst({
      where: {
        status: { in: ACTIVE_TRIP_STATUSES },
        scheduleId: data.scheduleId,
        createdAt: { gte: todayStart, lt: todayEnd },
        passenger: { [identityField]: identityValue },
      },
    });
    if (duplicateTrip) {
      return res.status(409).json({ code: "DUPLICATE_REGISTRATION", message: DUPLICATE_REGISTRATION_MESSAGE });
    }
  }

  const ship = await prisma.ship.findUnique({ where: { id: data.shipId } });
  const schedule = await prisma.schedule.findUnique({ where: { id: data.scheduleId } });
  if (!ship) return res.status(400).json({ message: "Selected ship does not exist" });
  if (!ship.active) return res.status(400).json({ message: "Selected ship is not currently active" });
  if (!schedule) return res.status(400).json({ message: "Selected schedule does not exist" });
  if (schedule.shipId !== data.shipId) return res.status(400).json({ message: "Selected schedule does not belong to the selected ship" });
  if (!schedule.active || !BOOKABLE_SCHEDULE_STATUSES.includes(schedule.status)) {
    return res.status(400).json({ message: "Selected schedule is not currently available for booking" });
  }

  const bookedCount = await getBookedCount(data.scheduleId);
  if (bookedCount + groupSize > ship.capacity) {
    return res.status(409).json({
      message: `Not enough seats remain for all ${groupSize} registered travelers on this schedule.`,
    });
  }

  let shipClass = null;
  try {
    ({ shipClass } = await resolveAccommodationConfig(data.shipId, data.accommodationClass));
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }
  if (shipClass) {
    const classBooked = await getClassBookedCount(data.scheduleId, data.accommodationClass);
    if (classBooked + groupSize > shipClass.capacity) {
      return res.status(409).json({
        message: `Not enough ${data.accommodationClass.replace("_", " ")} seats remain for all ${groupSize} travelers.`,
      });
    }
  }

  if (data.ticketSerialNumber) {
    const duplicateTicket = await prisma.trip.findFirst({ where: { ticketSerialNumber: data.ticketSerialNumber } });
    if (duplicateTicket) {
      return res.status(409).json({ message: "This ticket serial number has already been used for another booking." });
    }
  }

  let result = null;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_PASS_NUMBER_ATTEMPTS; attempt++) {
    const masterCode = generateGroupMasterCode();
    const leaderPassNumber = generatePassNumber();
    const masterQrCode = await generateQrDataUrl({
      type: "FAMILY",
      masterCode,
      passNumber: leaderPassNumber,
      passengerName: data.fullName,
      headFullName: data.fullName,
      memberCount: groupSize,
      transactionType: data.transactionType,
      ship: ship.name,
      schedule: schedule.departureTime,
      route: schedule.route,
      issuedAt: new Date().toISOString(),
    });

    try {
      result = await prisma.$transaction(async (tx) => {
        const currentBooked = await tx.trip.count({
          where: { scheduleId: data.scheduleId, status: { in: ["ACTIVE", "BOARDED"] } },
        });
        if (currentBooked + groupSize > ship.capacity) {
          const err = new Error(`Not enough seats remain for all ${groupSize} registered travelers on this schedule.`);
          err.status = 409;
          throw err;
        }

        if (data.accommodationClass && shipClass) {
          const currentClassBooked = await tx.trip.count({
            where: {
              scheduleId: data.scheduleId,
              accommodationClass: data.accommodationClass,
              status: { in: ["ACTIVE", "BOARDED"] },
            },
          });
          if (currentClassBooked + groupSize > shipClass.capacity) {
            const err = new Error(
              `Not enough ${data.accommodationClass.replace("_", " ")} seats remain for all ${groupSize} travelers.`
            );
            err.status = 409;
            throw err;
          }
        }

        const familyBooking = await tx.familyBooking.create({
          data: {
            masterCode,
            qrCodeData: masterQrCode,
            headFullName: data.fullName,
            headContact: data.contactNumber || null,
            memberCount: groupSize,
          },
        });

        const leaderPassenger = await tx.passenger.create({
          data: {
            fullName: data.fullName,
            contactNumber: data.contactNumber || null,
            gender: data.gender || null,
            address: data.address || null,
            passengerType: data.passengerType,
            passportNumber: isForeignTourist ? data.passportNumber : null,
            nationality: isForeignTourist ? data.nationality || null : null,
            age: data.age != null ? data.age : null,
            email: data.email || null,
            isEmailVerified: !!data.email && !!data.isEmailVerified,
            emergencyContactName: data.emergencyContactName || null,
            emergencyContactPhone: data.emergencyContactPhone || null,
            isSeniorCitizen: !!data.isSeniorCitizen,
            isPWD: !!data.isPWD,
            isPregnant: !!data.isPregnant,
            needsWheelchair: !!data.needsWheelchair,
            isStudent: !!data.isStudent,
            isInfant: !!data.isInfant,
            isMedicalEmergency: !!data.isMedicalEmergency,
            isPhoneVerified: !isForeignTourist && !!data.contactNumber,
            isPassportVerified: isForeignTourist && !!data.isPassportVerified,
            isFaceVerified: isForeignTourist && !!data.isFaceVerified,
            faceMatchScore: isForeignTourist && data.faceMatchScore != null ? data.faceMatchScore : null,
            selfiePhotoUrl: isForeignTourist ? data.selfiePhotoUrl || null : null,
            idNumber: !isForeignTourist ? data.idNumber || null : null,
            verificationDocumentType: data.verificationDocumentType || null,
            verificationDocumentUrl: data.verificationDocumentUrl || null,
            isDocumentVerified: !!data.isDocumentVerified,
          },
        });

        const leaderTrip = await tx.trip.create({
          data: {
            passNumber: leaderPassNumber,
            qrCodeData: masterQrCode,
            transactionType: data.transactionType,
            purpose: data.purpose || "OTHER",
            hasVehicle: !!data.hasVehicle,
            vehicleType: data.hasVehicle ? data.vehicleType || null : null,
            plateNumber: data.hasVehicle ? data.plateNumber || null : null,
            ticketSerialNumber: data.ticketSerialNumber || null,
            ticketVesselName: data.ticketVesselName || null,
            ticketTravelDate: data.ticketTravelDate || null,
            ticketVerified: !!data.ticketVerified,
            ticketPhotoUrl: data.ticketPhotoUrl || null,
            accommodationClass: data.accommodationClass,
            familyBookingId: familyBooking.id,
            passengerId: leaderPassenger.id,
            shipId: data.shipId,
            scheduleId: data.scheduleId,
          },
          include: { passenger: true },
        });

        const memberTrips = [];
        for (const member of members) {
          const memberPassenger = await tx.passenger.create({
            data: {
              fullName: member.fullName,
              contactNumber: null,
              gender: member.gender || null,
              address: data.address || null,
              passengerType: data.passengerType,
              age: member.age != null ? member.age : null,
              email: null,
              isSeniorCitizen: !!member.isSeniorCitizen,
              isPWD: !!member.isPWD,
              isPregnant: !!member.isPregnant,
              needsWheelchair: !!member.needsWheelchair,
              isStudent: !!member.isStudent,
              isInfant: !!member.isInfant,
              isMedicalEmergency: !!member.isMedicalEmergency,
              isPhoneVerified: false,
              isEmailVerified: false,
              isPassportVerified: false,
              isFaceVerified: false,
              isDocumentVerified: false,
            },
          });

          const memberTrip = await tx.trip.create({
            data: {
              passNumber: generatePassNumber(),
              // Intentionally blank: accompanying members are recorded in the
              // manifest/admin system but do not receive an individual QR.
              qrCodeData: "",
              transactionType: data.transactionType,
              purpose: data.purpose || "OTHER",
              accommodationClass: data.accommodationClass,
              familyBookingId: familyBooking.id,
              passengerId: memberPassenger.id,
              shipId: data.shipId,
              scheduleId: data.scheduleId,
            },
            include: { passenger: true },
          });
          memberTrips.push(memberTrip);
        }

        return { familyBooking, leaderPassenger, leaderTrip, memberTrips };
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (err.status === 409) break;
      if (err.code === "P2002") continue;
    }
  }

  if (!result) {
    const err = lastError || new Error("Failed to create the passenger group registration");
    if (err.status) return res.status(err.status).json({ message: err.message });
    throw err;
  }

  const referenceCode = result.familyBooking.masterCode;
  const notifications = {
    email: await sendRegistrationEmail({
      email: result.leaderPassenger.email,
      fullName: result.leaderPassenger.fullName,
      referenceCode,
      ship,
      schedule,
    }),
    sms: await sendRegistrationSms({
      contactNumber: result.leaderPassenger.contactNumber,
      fullName: result.leaderPassenger.fullName,
      referenceCode,
      ship,
      schedule,
    }),
  };

  const trips = [result.leaderTrip, ...result.memberTrips];
  return res.status(201).json({
    passenger: result.leaderPassenger,
    trip: result.leaderTrip,
    familyBooking: result.familyBooking,
    trips,
    groupMembers: result.memberTrips.map((trip) => trip.passenger),
    ship,
    schedule,
    qrCodeDataUrl: result.familyBooking.qrCodeData,
    passNumber: result.leaderTrip.passNumber,
    masterCode: result.familyBooking.masterCode,
    notifications,
    isGroup: true,
  });
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
    members = [],
  } = req.body;

  const isForeignTourist = passengerType === "FOREIGN_TOURIST";

  if (Array.isArray(members) && members.length > 0) {
    return createPrimaryWithMembers(req, res);
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
  if (!ship.active) return res.status(400).json({ message: "Selected ship is not currently active" });
  if (!schedule) return res.status(400).json({ message: "Selected schedule does not exist" });
  if (schedule.shipId !== shipId) return res.status(400).json({ message: "Selected schedule does not belong to the selected ship" });
  if (!schedule.active || !BOOKABLE_SCHEDULE_STATUSES.includes(schedule.status)) {
    return res.status(400).json({ message: "Selected schedule is not currently available for booking" });
  }

  const bookedCount = await getBookedCount(scheduleId);
  if (bookedCount >= ship.capacity) {
    return res.status(409).json({ message: "This schedule is fully booked. Please choose another schedule." });
  }

  let shipClass = null;
  try {
    ({ shipClass } = await resolveAccommodationConfig(shipId, accommodationClass));
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }
  if (shipClass) {
    const classBooked = await getClassBookedCount(scheduleId, accommodationClass);
    if (classBooked >= shipClass.capacity) {
      return res.status(409).json({
        message: `The ${accommodationClass.replace("_", " ")} class is fully booked on this schedule. Please choose another class.`,
      });
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
            isPhoneVerified: !isForeignTourist && !!contactNumber,
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
    sms: await sendRegistrationSms({
      contactNumber: passenger.contactNumber,
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
    sms: await sendRegistrationSms({
      contactNumber: passenger.contactNumber,
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

async function resendSms(req, res) {
  const { id } = req.params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { passenger: true, ship: true, schedule: true },
  });
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  const sms = await sendRegistrationSms({
    contactNumber: trip.passenger.contactNumber,
    fullName: trip.passenger.fullName,
    referenceCode: trip.passNumber,
    ship: trip.ship,
    schedule: trip.schedule,
  });

  await logAudit(
    req,
    "REGISTRATION_SMS_RESENT",
    `Resent registration SMS for ${trip.passenger.fullName} (${trip.passNumber}) — ${sms.sent ? "delivered" : `failed: ${sms.reason}`}`
  );

  res.json({ sms });
}


function currentManilaMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function routeForTransactionType(transactionType) {
  // Historical enum names: SIGN_IN is outbound/departing from Surigao,
  // SIGN_OUT is inbound/arriving in Surigao.
  return transactionType === "SIGN_IN" ? "SURIGAO_TO_DAPA" : "DAPA_TO_SURIGAO";
}

function circularMinuteDistance(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

async function nearestActiveSchedule(shipId, route, now = new Date()) {
  const schedules = await prisma.schedule.findMany({
    where: {
      shipId,
      route,
      active: true,
      status: { in: BOOKABLE_SCHEDULE_STATUSES },
    },
    orderBy: { departureTime: "asc" },
  });
  if (!schedules.length) return null;

  const nowMinutes = currentManilaMinutes(now);
  return [...schedules].sort((a, b) => {
    const aMinutes = parseTimeToMinutes(a.departureTime);
    const bMinutes = parseTimeToMinutes(b.departureTime);
    const aDistance = aMinutes == null ? Number.MAX_SAFE_INTEGER : circularMinuteDistance(aMinutes, nowMinutes);
    const bDistance = bMinutes == null ? Number.MAX_SAFE_INTEGER : circularMinuteDistance(bMinutes, nowMinutes);
    return aDistance - bDistance;
  })[0];
}

async function resolveKioskRegistration(code) {
  let family = await prisma.familyBooking.findUnique({
    where: { masterCode: code },
    include: {
      trips: {
        include: { passenger: true, ship: true, schedule: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  let sourceTrip = null;
  if (!family) {
    sourceTrip = await prisma.trip.findUnique({
      where: { passNumber: code },
      include: { passenger: true, ship: true, schedule: true, familyBooking: true },
    });
    if (!sourceTrip) return null;
    if (sourceTrip.familyBookingId) {
      family = await prisma.familyBooking.findUnique({
        where: { id: sourceTrip.familyBookingId },
        include: {
          trips: {
            include: { passenger: true, ship: true, schedule: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }
  }

  if (family) {
    const firstTripByPassenger = new Map();
    const lastTripByPassenger = new Map();
    for (const trip of family.trips) {
      if (!firstTripByPassenger.has(trip.passengerId)) firstTripByPassenger.set(trip.passengerId, trip);
      lastTripByPassenger.set(trip.passengerId, trip);
    }

    const firstTrips = [...firstTripByPassenger.values()];
    const leaderTrip = family.trips.find((trip) => Boolean(trip.qrCodeData)) || firstTrips[0] || null;
    const ordered = leaderTrip
      ? [leaderTrip, ...firstTrips.filter((trip) => trip.passengerId !== leaderTrip.passengerId)]
      : firstTrips;

    return {
      code,
      isFamily: true,
      family,
      sourceTrip: sourceTrip || leaderTrip,
      leaderPassengerId: leaderTrip?.passengerId || ordered[0]?.passengerId || null,
      passengers: ordered.map((trip, index) => ({
        passenger: trip.passenger,
        role: index === 0 ? "LEADER" : "MEMBER",
        lastTrip: lastTripByPassenger.get(trip.passengerId) || trip,
      })),
    };
  }

  return {
    code,
    isFamily: false,
    family: null,
    sourceTrip,
    leaderPassengerId: sourceTrip.passengerId,
    passengers: [{ passenger: sourceTrip.passenger, role: "LEADER", lastTrip: sourceTrip }],
  };
}

async function kioskProfile(req, res) {
  const code = String(req.query.query || "").trim();
  if (!code) return res.status(400).json({ message: "QR or pass code is required" });

  const registration = await resolveKioskRegistration(code);
  if (!registration) return res.status(404).json({ message: "No PORTGO registration was found for this QR code." });

  const leader = registration.passengers.find((item) => item.role === "LEADER") || registration.passengers[0];
  const lastTrip = leader?.lastTrip || null;

  res.json({
    serverTime: new Date().toISOString(),
    timeZone: "Asia/Manila",
    registration: {
      code,
      isFamily: registration.isFamily,
      familyMasterCode: registration.family?.masterCode || null,
      headFullName: registration.family?.headFullName || leader?.passenger?.fullName || null,
      passengerCount: registration.passengers.length,
      passengers: registration.passengers.map((item) => ({
        id: item.passenger.id,
        fullName: item.passenger.fullName,
        passengerType: item.passenger.passengerType,
        role: item.role,
      })),
      lastTrip: lastTrip
        ? {
            transactionType: lastTrip.transactionType,
            shipId: lastTrip.shipId,
            shipName: lastTrip.ship?.name || null,
            scheduleId: lastTrip.scheduleId,
            route: lastTrip.schedule?.route || null,
            departureTime: lastTrip.schedule?.departureTime || null,
            accommodationClass: lastTrip.accommodationClass || "ECONOMY",
            status: lastTrip.status,
          }
        : null,
    },
  });
}

async function kioskTime(req, res) {
  res.json({ serverTime: new Date().toISOString(), timeZone: "Asia/Manila" });
}

async function recordKioskTrip(req, res) {
  const { code, transactionType, shipId } = req.body;
  let { accommodationClass } = req.body;
  const registration = await resolveKioskRegistration(String(code || "").trim());
  if (!registration) return res.status(404).json({ message: "No PORTGO registration was found for this QR code." });

  const ship = await prisma.ship.findUnique({ where: { id: shipId }, include: { classes: true } });
  if (!ship || !ship.active) return res.status(400).json({ message: "Selected ship is not currently available." });

  if (!ship.classes.length) {
    accommodationClass = "ECONOMY";
  } else if (!accommodationClass || !ship.classes.some((item) => item.className === accommodationClass)) {
    return res.status(400).json({ message: "Select an accommodation type offered by this ship." });
  }

  const route = routeForTransactionType(transactionType);
  const now = new Date();
  const schedule = await nearestActiveSchedule(shipId, route, now);
  if (!schedule) {
    return res.status(409).json({
      message: "No active schedule is available for this ship and trip direction. Please ask port staff for assistance.",
    });
  }

  const passengerIds = registration.passengers.map((item) => item.passenger.id);
  const partySize = passengerIds.length;

  // Prevent a camera/manual double-submit from creating a second movement
  // immediately after a successful kiosk scan.
  const recentCutoff = new Date(now.getTime() - 5 * 60 * 1000);
  const recentMovement = await prisma.trip.findFirst({
    where: {
      passengerId: registration.leaderPassengerId,
      shipId: ship.id,
      scheduleId: schedule.id,
      transactionType,
      status: "BOARDED",
      boardedAt: { gte: recentCutoff },
    },
    orderBy: { boardedAt: "desc" },
  });
  if (recentMovement) {
    return res.status(409).json({
      code: "RECENT_KIOSK_SCAN",
      message: "This trip was already recorded in the last few minutes. Please do not scan the same trip twice.",
    });
  }

  const activeTrips = await prisma.trip.findMany({
    where: { passengerId: { in: passengerIds }, status: "ACTIVE" },
    include: { schedule: true },
    orderBy: { createdAt: "desc" },
  });

  const activeTripByPassenger = new Map();
  for (const passengerId of passengerIds) {
    const trips = activeTrips.filter((trip) => trip.passengerId === passengerId);
    const matchingRoute = trips.find((trip) => trip.schedule?.route === route);
    activeTripByPassenger.set(passengerId, matchingRoute || trips[0] || null);
  }

  const reusableTripIds = [...activeTripByPassenger.values()].filter(Boolean).map((trip) => trip.id);
  const classConfig = ship.classes.find((item) => item.className === accommodationClass) || null;

  const updatedTrips = await prisma.$transaction(async (tx) => {
    const totalBooked = await tx.trip.count({
      where: {
        scheduleId: schedule.id,
        status: { in: ACTIVE_TRIP_STATUSES },
        ...(reusableTripIds.length ? { id: { notIn: reusableTripIds } } : {}),
      },
    });
    if (totalBooked + partySize > ship.capacity) {
      const err = new Error(`Only ${Math.max(0, ship.capacity - totalBooked)} seat(s) remain on this sailing.`);
      err.status = 409;
      throw err;
    }

    if (classConfig) {
      const classBooked = await tx.trip.count({
        where: {
          scheduleId: schedule.id,
          accommodationClass,
          status: { in: ACTIVE_TRIP_STATUSES },
          ...(reusableTripIds.length ? { id: { notIn: reusableTripIds } } : {}),
        },
      });
      if (classBooked + partySize > classConfig.capacity) {
        const err = new Error(`Not enough ${accommodationClass.replace(/_/g, " ")} seats remain for this party.`);
        err.status = 409;
        throw err;
      }
    }

    const rows = [];
    for (const item of registration.passengers) {
      const existing = activeTripByPassenger.get(item.passenger.id);
      if (existing) {
        rows.push(
          await tx.trip.update({
            where: { id: existing.id },
            data: {
              transactionType,
              shipId: ship.id,
              scheduleId: schedule.id,
              accommodationClass,
              status: "BOARDED",
              boardedAt: now,
              statusUpdatedAt: now,
              // Trip records represent actual kiosk movements. Moving the
              // planned ACTIVE trip timestamp to scan time keeps dashboard
              // totals and reports aligned with the real port movement.
              createdAt: now,
            },
            include: { passenger: true, ship: true, schedule: true },
          })
        );
        continue;
      }

      const lastTrip = item.lastTrip;
      rows.push(
        await tx.trip.create({
          data: {
            passNumber: generatePassNumber(),
            // Existing QR remains the passenger identity token. New movement
            // rows do not issue another QR; group members never receive one.
            qrCodeData:
              item.role === "LEADER"
                ? registration.family?.qrCodeData || registration.sourceTrip?.qrCodeData || ""
                : "",
            transactionType,
            purpose: lastTrip?.purpose || "OTHER",
            status: "BOARDED",
            accommodationClass,
            familyBookingId: registration.family?.id || null,
            passengerId: item.passenger.id,
            shipId: ship.id,
            scheduleId: schedule.id,
            boardedAt: now,
            statusUpdatedAt: now,
          },
          include: { passenger: true, ship: true, schedule: true },
        })
      );
    }
    return rows;
  }).catch((err) => {
    if (err.status) return Promise.reject(err);
    throw err;
  });

  await logAudit(
    req,
    "KIOSK_QR_TRIP_RECORDED",
    `${registration.isFamily ? `${registration.family.headFullName} group (${partySize})` : updatedTrips[0].passenger.fullName} recorded ${transactionType === "SIGN_IN" ? "outbound" : "inbound"} on ${ship.name} at ${now.toISOString()}`
  );

  res.json({
    success: true,
    scannedAt: now.toISOString(),
    timeZone: "Asia/Manila",
    partySize,
    transactionType,
    accommodationClass,
    ship: { id: ship.id, name: ship.name, code: ship.code },
    schedule: {
      id: schedule.id,
      route: schedule.route,
      departureTime: schedule.departureTime,
      voyageNumber: schedule.voyageNumber,
      gateNumber: schedule.gateNumber,
    },
    passengers: updatedTrips.map((trip) => ({
      id: trip.passenger.id,
      fullName: trip.passenger.fullName,
      tripId: trip.id,
      passNumber: trip.passNumber,
    })),
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
    include: { passenger: true, ship: true, schedule: true, familyBooking: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  // For unified group registrations, the primary passenger is the only trip
  // that stores the shared QR. Keep that row first so kiosk retrieval always
  // presents the QR holder before accompanying members.
  trips.sort((a, b) => Number(Boolean(b.qrCodeData)) - Number(Boolean(a.qrCodeData)));

  res.json({
    trips: trips.map((trip) => ({
      trip,
      passenger: trip.passenger,
      ship: trip.ship,
      schedule: trip.schedule,
      qrCodeDataUrl: trip.qrCodeData,
      passNumber: trip.passNumber,
      familyBooking: trip.familyBooking || null,
    })),
  });
}

module.exports = { create, search, rebook, lookup, resendSms, kioskProfile, kioskTime, recordKioskTrip };
