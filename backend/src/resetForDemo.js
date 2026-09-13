require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");
const { generatePassNumber, generateQrDataUrl } = require("./lib/qrcode");

const ADMINS = [
  { fullName: "Port Administrator", email: "admin@portgo.com", role: "SUPER_ADMIN", password: "admin123" },
  { fullName: "Liza Fernandez", email: "ticketing@portgo.com", role: "TICKETING_OFFICER", password: "ticket123" },
  { fullName: "Mark Anthony Reyes", email: "gatescanner@portgo.com", role: "GATE_SCANNER", password: "gate123" },
];

const SHIPS = [
  { name: "MV Del Pilar Express", code: "DPE-01", capacity: 150 },
  { name: "MV Siargao Pearl", code: "SGP-01", capacity: 120 },
  { name: "MV Bagong Lakas", code: "BGL-01", capacity: 100 },
];

const SCHEDULES = [
  { shipCode: "DPE-01", route: "SURIGAO_TO_DAPA", departureTime: "06:00 AM", voyageNumber: "DPE-101" },
  { shipCode: "DPE-01", route: "DAPA_TO_SURIGAO", departureTime: "12:00 PM", voyageNumber: "DPE-102" },
  { shipCode: "DPE-01", route: "SURIGAO_TO_DAPA", departureTime: "04:30 PM", voyageNumber: "DPE-103" },
  { shipCode: "SGP-01", route: "SURIGAO_TO_DAPA", departureTime: "08:30 AM", voyageNumber: "SGP-201" },
  { shipCode: "SGP-01", route: "DAPA_TO_SURIGAO", departureTime: "02:30 PM", voyageNumber: "SGP-202" },
  { shipCode: "SGP-01", route: "DAPA_TO_SURIGAO", departureTime: "06:00 PM", voyageNumber: "SGP-203" },
  { shipCode: "BGL-01", route: "SURIGAO_TO_DAPA", departureTime: "10:00 AM", voyageNumber: "BGL-301" },
  { shipCode: "BGL-01", route: "DAPA_TO_SURIGAO", departureTime: "09:30 AM", voyageNumber: "BGL-302" },
  { shipCode: "BGL-01", route: "DAPA_TO_SURIGAO", departureTime: "05:00 PM", voyageNumber: "BGL-303" },
];

const FIRST_NAMES = [
  "Maria", "Juan", "Rosario", "Pedro", "Ana Marie", "Ramon", "Ligaya", "Carlos",
  "Teresa", "Rico", "Grace", "Ferdinand", "Josefina", "Danilo", "Corazon",
];
const LAST_NAMES = [
  "Santos", "Dela Cruz", "Villanueva", "Bautista", "Reyes", "Garcia", "Fernandez",
  "Mendoza", "Aquino", "Domingo", "Uy", "Torres", "Ramos", "Castillo", "Navarro",
];
const BARANGAYS = [
  "Barangay Washington, Surigao City", "Barangay Luna, Surigao City", "Poblacion, Dapa, Siargao",
  "Barangay Trinidad, Surigao City", "Union, General Luna, Siargao", "Barangay Taft, Surigao City",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName() {
  return `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
}

function randomPhone() {
  const n = String(Math.floor(1000000 + Math.random() * 8999999));
  return `09${Math.floor(10 + Math.random() * 89)}-${n.slice(0, 3)}-${n.slice(3, 7)}`;
}

function daysAgo(n, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// [daysAgo, count, statuses to distribute across the count]
const BOOKING_PLAN = [
  { daysAgo: 4, statuses: ["BOARDED", "BOARDED", "BOARDED"] },
  { daysAgo: 3, statuses: ["BOARDED", "BOARDED", "NO_SHOW"] },
  { daysAgo: 2, statuses: ["BOARDED", "BOARDED", "BOARDED"] },
  { daysAgo: 1, statuses: ["BOARDED", "BOARDED", "CANCELLED"] },
  { daysAgo: 0, statuses: ["ACTIVE", "ACTIVE", "BOARDED"] },
];

// Curated Barangay Resident Masterlist entries — includes the specific
// names used to field-test the kiosk autocomplete, plus a spread of
// randomly-generated Dapa/Surigao residents for realistic search coverage.
const BARANGAY_RESIDENTS = [
  { fullName: "Juan Dela Cruz", gender: "MALE", age: 34, barangay: "Barangay Washington", municipality: "Surigao City", status: "Active", phoneNumber: "0917-123-4567" },
  { fullName: "Maria Santos", gender: "FEMALE", age: 41, barangay: "Poblacion", municipality: "Dapa, Siargao", status: "Active", phoneNumber: "0918-222-3344" },
  { fullName: "Erric Traya", gender: "MALE", age: 23, barangay: "General Luna", municipality: "Surigao del Norte", status: "Active", phoneNumber: "0912-345-6789" },
  { fullName: "Elena Gonzaga", gender: "FEMALE", age: 29, barangay: "Barangay Luna", municipality: "Surigao City", status: "Active", phoneNumber: "0919-456-7890" },
  { fullName: "Pedro Penduko", gender: "MALE", age: 55, barangay: "Union", municipality: "General Luna, Siargao", status: "Active", phoneNumber: "0920-333-4455" },
];

async function wipe() {
  await prisma.trip.deleteMany({});
  await prisma.passenger.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.ship.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.portAdvisory.deleteMany({});
  await prisma.barangayResident.deleteMany({});
}

async function main() {
  console.log("Wiping existing data...");
  await wipe();

  console.log("Seeding admin accounts...");
  for (const { password, ...a } of ADMINS) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.admin.create({ data: { ...a, passwordHash } });
  }

  console.log("Seeding ships...");
  const shipsByCode = {};
  for (const s of SHIPS) {
    const ship = await prisma.ship.create({ data: s });
    shipsByCode[s.code] = ship;
  }

  console.log("Seeding schedules...");
  const schedules = [];
  for (const s of SCHEDULES) {
    const ship = shipsByCode[s.shipCode];
    const schedule = await prisma.schedule.create({
      data: {
        shipId: ship.id,
        route: s.route,
        departureTime: s.departureTime,
        daysOfWeek: "Mon-Sun",
        voyageNumber: s.voyageNumber,
      },
    });
    schedules.push({ ...schedule, ship });
  }

  console.log("Seeding port advisory (inactive)...");
  await prisma.portAdvisory.create({ data: { active: false } });

  console.log("Seeding Barangay Resident Masterlist...");
  const generatedResidents = Array.from({ length: 30 }).map(() => {
    const gender = Math.random() < 0.5 ? "MALE" : "FEMALE";
    return {
      fullName: randomName(),
      gender,
      age: 18 + Math.floor(Math.random() * 60),
      barangay: randomFrom(BARANGAYS),
      municipality: randomFrom(["Surigao City", "Dapa, Siargao"]),
      status: "Active",
      phoneNumber: randomPhone(),
    };
  });
  await prisma.barangayResident.createMany({ data: [...BARANGAY_RESIDENTS, ...generatedResidents] });

  console.log("Seeding sample passenger bookings...");
  let bookingCount = 0;
  for (const day of BOOKING_PLAN) {
    for (let i = 0; i < day.statuses.length; i++) {
      const status = day.statuses[i];
      const schedule = randomFrom(schedules);
      const typeRoll = Math.random();
      const passengerType = typeRoll < 0.65 ? "LOCAL_RESIDENT" : typeRoll < 0.8 ? "LOCAL_TOURIST" : "FOREIGN_TOURIST";
      const isForeignTourist = passengerType === "FOREIGN_TOURIST";
      const createdAt = daysAgo(day.daysAgo, 6 + i * 3, Math.floor(Math.random() * 60));
      const fullName = randomName();
      const age = 8 + Math.floor(Math.random() * 70);
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
          passportNumber: isForeignTourist ? `P${Math.floor(1000000 + Math.random() * 8999999)}` : null,
          nationality: isForeignTourist ? randomFrom(["Japanese", "American", "German", "South Korean"]) : null,
          idNumber: !isForeignTourist ? `ID-${Math.floor(100000 + Math.random() * 899999)}` : null,
          verificationDocumentType: isForeignTourist ? "PASSPORT" : isStudent ? "STUDENT_ID" : "VALID_ID",
          isDocumentVerified: !isForeignTourist && Math.random() < 0.85,
          age,
          isSeniorCitizen,
          isStudent,
          isPWD,
          emergencyContactName: Math.random() < 0.6 ? randomName() : null,
          emergencyContactPhone: Math.random() < 0.6 ? randomPhone() : null,
          isPhoneVerified: !isForeignTourist,
          isPassportVerified: isForeignTourist,
          isFaceVerified: isForeignTourist,
          createdAt,
          updatedAt: createdAt,
        },
      });

      const passNumber = generatePassNumber();
      const qrCodeData = await generateQrDataUrl({
        passNumber,
        passengerName: fullName,
        transactionType: "SIGN_IN",
        ship: schedule.ship.name,
        schedule: schedule.departureTime,
        route: schedule.route,
        issuedAt: createdAt.toISOString(),
      });

      await prisma.trip.create({
        data: {
          passNumber,
          qrCodeData,
          transactionType: Math.random() < 0.5 ? "SIGN_IN" : "SIGN_OUT",
          purpose: randomFrom(["TOURISM", "BUSINESS", "RESIDENT_RETURN", "MEDICAL", "EDUCATION", "OTHER"]),
          status,
          accommodationClass: randomFrom(["ECONOMY", "TOURIST_AIRCON", "BUSINESS"]),
          hasVehicle: Math.random() < 0.15,
          vehicleType: Math.random() < 0.15 ? randomFrom(["MOTORCYCLE", "SEDAN_SUV", "TRUCK_CARGO"]) : null,
          plateNumber: Math.random() < 0.15 ? `ABC-${1000 + Math.floor(Math.random() * 8999)}` : null,
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
      bookingCount += 1;
    }
  }

  console.log("\nDemo reset complete.");
  console.log(`Ships: ${SHIPS.length}, Schedules: ${schedules.length}, Bookings: ${bookingCount}`);
  console.log("\nAdmin logins:");
  for (const a of ADMINS) {
    console.log(`  - ${a.role.padEnd(18)} ${a.email}  password: ${a.password}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
