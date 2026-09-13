const prisma = require("../lib/prisma");
const { portsForRoute } = require("../lib/manifest");
const { parseTimeToMinutes, currentMinutesOfDay } = require("../lib/timeOfDay");
const { getOrCreateSingleton: getAdvisorySingleton } = require("./advisory.controller");

const BOARDING_WINDOW_MINUTES = 60;

const CANCELLED_STATUSES = ["CANCELLED_WEATHER", "CANCELLED_MAINTENANCE", "MAINTENANCE"];

function computeBoardStatus(schedule) {
  if (CANCELLED_STATUSES.includes(schedule.status)) return "CANCELLED";
  if (schedule.status === "DELAYED") return "DELAYED";

  const departureMinutes = parseTimeToMinutes(schedule.departureTime);
  const nowMinutes = currentMinutesOfDay();
  if (departureMinutes == null) return "ON_TIME";

  const diff = departureMinutes - nowMinutes;
  if (diff < 0) return "DEPARTED";
  if (diff <= BOARDING_WINDOW_MINUTES) return "BOARDING";
  return "ON_TIME";
}

async function getBoard(req, res) {
  const schedules = await prisma.schedule.findMany({
    where: { active: true },
    include: { ship: true },
  });

  const board = schedules
    .map((s) => ({
      id: s.id,
      shipName: s.ship.name,
      route: s.route,
      ports: portsForRoute(s.route),
      departureTime: s.departureTime,
      departureMinutes: parseTimeToMinutes(s.departureTime),
      voyageNumber: s.voyageNumber,
      gateNumber: s.gateNumber,
      status: computeBoardStatus(s),
      delayMinutes: s.delayMinutes,
      delayReason: s.delayReason,
      cancellationReason: s.cancellationReason,
    }))
    .sort((a, b) => (a.departureMinutes ?? 0) - (b.departureMinutes ?? 0));

  const advisory = await getAdvisorySingleton();

  res.json({ board, advisory, serverTime: new Date().toISOString() });
}

module.exports = { getBoard };
