const prisma = require("./prisma");

const MANIFEST_STATUSES = ["ACTIVE", "BOARDED", "NO_SHOW"];

function portsForRoute(route) {
  return route === "SURIGAO_TO_DAPA"
    ? { origin: "Port of Surigao", destination: "Port of Dapa" }
    : { origin: "Port of Dapa", destination: "Port of Surigao" };
}

async function getManifestData(scheduleId) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { ship: true },
  });
  if (!schedule) return null;

  const trips = await prisma.trip.findMany({
    where: { scheduleId, status: { in: MANIFEST_STATUSES } },
    include: { passenger: true, familyBooking: true },
    orderBy: [{ familyBookingId: "asc" }, { createdAt: "asc" }],
  });

  const ports = portsForRoute(schedule.route);
  const boardedCount = trips.filter((t) => t.status === "BOARDED").length;
  const vehicleTrips = trips.filter((t) => t.hasVehicle);
  const vehicleSummary = { MOTORCYCLE: 0, SEDAN_SUV: 0, TRUCK_CARGO: 0 };
  for (const t of vehicleTrips) {
    if (t.vehicleType) vehicleSummary[t.vehicleType] = (vehicleSummary[t.vehicleType] || 0) + 1;
  }

  const signOff = await prisma.manifestSignOff.findUnique({ where: { scheduleId } });

  return {
    schedule,
    ship: schedule.ship,
    ports,
    trips,
    vehicleTrips,
    vehicleSummary,
    totalBooked: trips.length,
    boardedCount,
    capacity: schedule.ship.capacity,
    signOff,
  };
}

module.exports = { getManifestData, portsForRoute, MANIFEST_STATUSES };
