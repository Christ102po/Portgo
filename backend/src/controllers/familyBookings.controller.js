const prisma = require("../lib/prisma");
const { generatePassNumber, generateQrDataUrl } = require("../lib/qrcode");
const { sendRegistrationEmail } = require("../lib/registrationEmail");
const { logAudit } = require("../lib/audit");
const { getOrCreateSingleton: getAdvisorySingleton } = require("./advisory.controller");
const { verifyPhoneVerificationToken } = require("../lib/phoneVerificationToken");

const MAX_ATTEMPTS = 3;
const BOOKABLE_SCHEDULE_STATUSES = ["ACTIVE", "DELAYED"];
const OCCUPYING_STATUSES = ["ACTIVE", "BOARDED"];

function randomToken(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function generateMasterCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `FAM-${y}${m}${d}-${randomToken(5)}`;
}

async function create(req, res) {
  const {
    headContact,
    headEmail,
    gender,
    address,
    passengerType,
    passportNumber,
    idNumber,
    verificationDocumentType,
    verificationDocumentUrl,
    transactionType,
    purpose,
    shipId,
    scheduleId,
    accommodationClass,
    phoneVerificationToken,
    members,
  } = req.body;

  const isForeignTourist = passengerType === "FOREIGN_TOURIST";

  if (!isForeignTourist && !req.admin) {
    const verification = verifyPhoneVerificationToken(phoneVerificationToken, headContact);
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

  if (!Array.isArray(members) || members.length < 2) {
    return res.status(400).json({ message: "A family/group booking needs at least 2 members" });
  }

  const ship = await prisma.ship.findUnique({ where: { id: shipId } });
  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!ship) return res.status(400).json({ message: "Selected ship does not exist" });
  if (!schedule) return res.status(400).json({ message: "Selected schedule does not exist" });
  if (!BOOKABLE_SCHEDULE_STATUSES.includes(schedule.status)) {
    return res.status(400).json({ message: "Selected schedule is not currently available for booking" });
  }

  let shipClass = null;
  if (accommodationClass) {
    shipClass = await prisma.shipClass.findUnique({
      where: { shipId_className: { shipId, className: accommodationClass } },
    });
  }

  let result = null;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const masterCode = generateMasterCode();
    const headFullName = members[0].fullName;

    try {
      result = await prisma.$transaction(async (tx) => {
        const currentBooked = await tx.trip.count({
          where: { scheduleId, status: { in: OCCUPYING_STATUSES } },
        });
        if (currentBooked + members.length > ship.capacity) {
          const err = new Error("Not enough seats left on this schedule for the whole group.");
          err.status = 409;
          throw err;
        }

        if (accommodationClass && shipClass) {
          const currentClassBooked = await tx.trip.count({
            where: { scheduleId, accommodationClass, status: { in: OCCUPYING_STATUSES } },
          });
          if (currentClassBooked + members.length > shipClass.capacity) {
            const err = new Error(
              `Not enough ${accommodationClass.replace("_", " ")} class seats left for the whole group.`
            );
            err.status = 409;
            throw err;
          }
        }

        const masterQrCodeData = await generateQrDataUrl({
          type: "FAMILY",
          masterCode,
          headFullName,
          memberCount: members.length,
          ship: ship.name,
          schedule: schedule.departureTime,
          route: schedule.route,
          issuedAt: new Date().toISOString(),
        });

        const familyBooking = await tx.familyBooking.create({
          data: {
            masterCode,
            qrCodeData: masterQrCodeData,
            headFullName,
            headContact,
            memberCount: members.length,
          },
        });

        const trips = [];
        for (let i = 0; i < members.length; i++) {
          const member = members[i];

          const passenger = await tx.passenger.create({
            data: {
              fullName: member.fullName,
              contactNumber: headContact,
              email: headEmail || null,
              gender: member.gender || gender,
              address,
              passengerType,
              passportNumber: i === 0 && isForeignTourist ? passportNumber || null : null,
              idNumber: i === 0 && !isForeignTourist ? idNumber || null : null,
              verificationDocumentType: i === 0 ? verificationDocumentType || null : null,
              verificationDocumentUrl: i === 0 ? verificationDocumentUrl || null : null,
              age: member.age != null ? member.age : null,
              isSeniorCitizen: !!member.isSeniorCitizen,
              isPWD: !!member.isPWD,
              isPregnant: !!member.isPregnant,
              needsWheelchair: !!member.needsWheelchair,
              isStudent: !!member.isStudent,
              isInfant: !!member.isInfant,
              isMedicalEmergency: !!member.isMedicalEmergency,
              isPhoneVerified: !isForeignTourist,
            },
          });

          const passNumber = generatePassNumber();
          const qrCodeData = await generateQrDataUrl({
            passNumber,
            passengerName: member.fullName,
            transactionType,
            ship: ship.name,
            schedule: schedule.departureTime,
            route: schedule.route,
            familyMasterCode: masterCode,
            issuedAt: new Date().toISOString(),
          });

          const trip = await tx.trip.create({
            data: {
              passNumber,
              qrCodeData,
              transactionType,
              purpose: purpose || "OTHER",
              accommodationClass,
              familyBookingId: familyBooking.id,
              passengerId: passenger.id,
              shipId,
              scheduleId,
            },
            include: { passenger: true },
          });
          trips.push(trip);
        }

        return { familyBooking, trips };
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (err.status === 409) break;
    }
  }

  if (!result) throw lastError || new Error("Failed to create family booking");

  const familyLabel = `${result.familyBooking.headFullName} & Family (${result.familyBooking.memberCount})`;
  const notifications = {
    email: await sendRegistrationEmail({
      email: headEmail || null,
      fullName: familyLabel,
      referenceCode: result.familyBooking.masterCode,
      ship,
      schedule,
    }),
  };

  res.status(201).json({
    familyBooking: result.familyBooking,
    trips: result.trips,
    ship,
    schedule,
    masterQrCodeDataUrl: result.familyBooking.qrCodeData,
    masterCode: result.familyBooking.masterCode,
    notifications,
  });
}

module.exports = { create };
