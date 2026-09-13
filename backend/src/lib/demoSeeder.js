const prisma = require("./prisma");
const { generatePassNumber, generateQrDataUrl } = require("./qrcode");

const FIRST_NAMES = [
  "Maria", "Juan", "Rosario", "Pedro", "Ana Marie", "Ramon", "Ligaya", "Carlos",
  "Teresa", "Rico", "Grace", "Ferdinand", "Josefina", "Danilo", "Corazon", "Michael",
  "Angelica", "Bryan", "Cristina", "Noel",
];
const LAST_NAMES = [
  "Santos", "Dela Cruz", "Villanueva", "Bautista", "Reyes", "Garcia", "Fernandez",
  "Mendoza", "Aquino", "Domingo", "Uy", "Torres", "Ramos", "Castillo", "Navarro",
  "Pascual", "Ocampo", "Salazar", "Del Rosario", "Enriquez",
];
const BARANGAYS = [
  "Barangay Washington, Surigao City", "Barangay Luna, Surigao City", "Poblacion, Dapa, Siargao",
  "Barangay Trinidad, Surigao City", "Union, General Luna, Siargao", "Barangay Taft, Surigao City",
  "Barangay Mabini, Surigao City", "Sto. Nino, Dapa, Siargao",
];
const NATIONALITIES = ["Japanese", "American", "German", "South Korean", "Australian", "British", "Canadian", "Dutch", "French"];
const PURPOSES = ["TOURISM", "BUSINESS", "RESIDENT_RETURN", "CARGO", "MEDICAL", "EDUCATION", "OTHER"];
const VEHICLE_TYPES = ["MOTORCYCLE", "SEDAN_SUV", "TRUCK_CARGO"];
const ACCOMMODATION_CLASSES = ["ECONOMY", "TOURIST_AIRCON", "BUSINESS"];

// Weighted spread across the three passenger categories: mostly local
// residents, with local and foreign tourists mixed in. Student/Senior/PWD
// discount eligibility is a separate independent flag, not a category.
function randomPassengerType() {
  const roll = Math.random();
  if (roll < 0.65) return "LOCAL_RESIDENT";
  if (roll < 0.8) return "LOCAL_TOURIST";
  return "FOREIGN_TOURIST";
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomPhone() {
  const n = String(randomInt(1000000, 9999999));
  return `09${randomInt(10, 99)}-${n.slice(0, 3)}-${n.slice(3, 7)}`;
}

// Weighted spread: ~18% today, ~22% this week, ~28% this month, ~32% earlier this year.
function pickCreatedAt(now) {
  const bucket = Math.random();
  let daysAgo;
  if (bucket < 0.18) {
    daysAgo = 0;
  } else if (bucket < 0.4) {
    daysAgo = randomInt(1, 6);
  } else if (bucket < 0.68) {
    daysAgo = randomInt(7, 29);
  } else {
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000);
    const maxBack = Math.max(31, Math.min(dayOfYear - 5, 300));
    daysAgo = randomInt(30, maxBack);
  }
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randomInt(5, 19), randomInt(0, 59), 0, 0);
  return d;
}

async function seedDemoPassengers({ count = 100 } = {}) {
  const [ships, schedules] = await Promise.all([
    prisma.ship.findMany({ where: { active: true } }),
    prisma.schedule.findMany({ where: { active: true }, include: { ship: true } }),
  ]);

  if (!ships.length || !schedules.length) {
    const err = new Error("Seed at least one active ship and schedule before generating demo data.");
    err.code = "NO_SHIPS_OR_SCHEDULES";
    throw err;
  }

  const now = new Date();
  let created = 0;

  for (let i = 0; i < count; i++) {
    const schedule = randomFrom(schedules);
    const passengerType = randomPassengerType();
    const isForeignTourist = passengerType === "FOREIGN_TOURIST";
    const createdAt = pickCreatedAt(now);
    const fullName = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
    const transactionType = Math.random() < 0.55 ? "SIGN_IN" : "SIGN_OUT";
    const statusRoll = Math.random();
    const status =
      statusRoll < 0.7 ? "BOARDED" : statusRoll < 0.85 ? "ACTIVE" : statusRoll < 0.93 ? "NO_SHOW" : "CANCELLED";
    const hasVehicle = Math.random() < 0.12;
    const age = randomInt(8, 75);
    const isSeniorCitizen = !isForeignTourist && age >= 60;
    const isStudent = !isForeignTourist && !isSeniorCitizen && age <= 24 && Math.random() < 0.5;
    const isPWD = !isForeignTourist && !isSeniorCitizen && !isStudent && Math.random() < 0.08;

    const passenger = await prisma.passenger.create({
      data: {
        fullName,
        contactNumber: randomPhone(),
        gender: randomFrom(["MALE", "FEMALE"]),
        address: !isForeignTourist ? randomFrom(BARANGAYS) : null,
        passengerType,
        passportNumber: isForeignTourist ? `P${randomInt(1000000, 9999999)}` : null,
        nationality: isForeignTourist ? randomFrom(NATIONALITIES) : null,
        idNumber: !isForeignTourist ? `ID-${randomInt(100000, 999999)}` : null,
        verificationDocumentType: isForeignTourist ? "PASSPORT" : isStudent ? "STUDENT_ID" : "VALID_ID",
        isDocumentVerified: !isForeignTourist && Math.random() < 0.85,
        age,
        isSeniorCitizen,
        isStudent,
        isPWD,
        isPhoneVerified: !isForeignTourist,
        isPassportVerified: isForeignTourist,
        isFaceVerified: isForeignTourist,
        faceMatchScore: isForeignTourist ? Math.round((95 + Math.random() * 4.9) * 10) / 10 : null,
        createdAt,
        updatedAt: createdAt,
      },
    });

    const passNumber = generatePassNumber();
    const qrCodeData = await generateQrDataUrl({
      passNumber,
      passengerName: fullName,
      transactionType,
      ship: schedule.ship.name,
      schedule: schedule.departureTime,
      route: schedule.route,
      issuedAt: createdAt.toISOString(),
    });

    await prisma.trip.create({
      data: {
        passNumber,
        qrCodeData,
        transactionType,
        purpose: randomFrom(PURPOSES),
        status,
        accommodationClass: randomFrom(ACCOMMODATION_CLASSES),
        hasVehicle,
        vehicleType: hasVehicle ? randomFrom(VEHICLE_TYPES) : null,
        plateNumber: hasVehicle ? `ABC-${randomInt(1000, 9999)}` : null,
        statusReason: status === "CANCELLED" ? "Passenger request" : status === "NO_SHOW" ? "Did not arrive at gate" : null,
        statusUpdatedAt: status !== "ACTIVE" ? createdAt : null,
        boardedAt: status === "BOARDED" ? createdAt : null,
        passengerId: passenger.id,
        shipId: schedule.shipId,
        scheduleId: schedule.id,
        createdAt,
        updatedAt: createdAt,
      },
    });
    created += 1;
  }

  return { created };
}

module.exports = { seedDemoPassengers };
