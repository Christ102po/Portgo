const prisma = require("./prisma");

const OCCUPYING_STATUSES = ["ACTIVE", "BOARDED"];

async function getBookedCounts(scheduleIds) {
  if (scheduleIds.length === 0) return new Map();
  const groups = await prisma.trip.groupBy({
    by: ["scheduleId"],
    where: { scheduleId: { in: scheduleIds }, status: { in: OCCUPYING_STATUSES } },
    _count: { _all: true },
  });
  const map = new Map();
  for (const g of groups) map.set(g.scheduleId, g._count._all);
  return map;
}

async function getBookedCount(scheduleId) {
  return prisma.trip.count({
    where: { scheduleId, status: { in: OCCUPYING_STATUSES } },
  });
}

async function getClassBookedCounts(scheduleId) {
  const groups = await prisma.trip.groupBy({
    by: ["accommodationClass"],
    where: { scheduleId, status: { in: OCCUPYING_STATUSES }, accommodationClass: { not: null } },
    _count: { _all: true },
  });
  const map = new Map();
  for (const g of groups) map.set(g.accommodationClass, g._count._all);
  return map;
}

async function getClassBookedCount(scheduleId, className) {
  return prisma.trip.count({
    where: { scheduleId, accommodationClass: className, status: { in: OCCUPYING_STATUSES } },
  });
}

module.exports = {
  getBookedCounts,
  getBookedCount,
  getClassBookedCounts,
  getClassBookedCount,
  OCCUPYING_STATUSES,
};
