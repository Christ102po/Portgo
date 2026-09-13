const prisma = require("../lib/prisma");

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function getStats(req, res) {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const last30DaysStart = new Date(todayStart);
  last30DaysStart.setDate(last30DaysStart.getDate() - 29);
  const last7DaysStart = new Date(todayStart);
  last7DaysStart.setDate(last7DaysStart.getDate() - 6);

  const [
    totalToday,
    signInToday,
    signOutToday,
    localCount,
    touristCount,
    touristVerifiedCount,
    boardedCount,
    cancelledCount,
    noShowCount,
    totalYesterday,
    local30d,
    tourist30d,
    recentTrips,
  ] = await Promise.all([
    prisma.trip.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, transactionType: "SIGN_IN" } }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, transactionType: "SIGN_OUT" } }),
    prisma.passenger.count({ where: { createdAt: { gte: todayStart }, passengerType: { not: "FOREIGN_TOURIST" } } }),
    prisma.passenger.count({ where: { createdAt: { gte: todayStart }, passengerType: "FOREIGN_TOURIST" } }),
    prisma.passenger.count({
      where: { createdAt: { gte: todayStart }, passengerType: "FOREIGN_TOURIST", isPassportVerified: true, isFaceVerified: true },
    }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, status: "BOARDED" } }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, status: "CANCELLED" } }),
    prisma.trip.count({ where: { createdAt: { gte: todayStart }, status: "NO_SHOW" } }),
    prisma.trip.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.passenger.count({ where: { createdAt: { gte: last30DaysStart }, passengerType: { not: "FOREIGN_TOURIST" } } }),
    prisma.passenger.count({ where: { createdAt: { gte: last30DaysStart }, passengerType: "FOREIGN_TOURIST" } }),
    prisma.trip.findMany({ where: { createdAt: { gte: last7DaysStart } }, select: { createdAt: true } }),
  ]);

  const hourCounts = Array.from({ length: 24 }, () => 0);
  for (const t of recentTrips) hourCounts[new Date(t.createdAt).getHours()] += 1;
  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

  res.json({
    totalToday,
    signInToday,
    signOutToday,
    localCount,
    touristCount,
    touristVerifiedCount,
    boardedCount,
    cancelledCount,
    noShowCount,
    trend: { totalTodayChangePct: pctChange(totalToday, totalYesterday) },
    localTouristRatio30d: { local: local30d, tourist: tourist30d },
    peakHours,
  });
}

module.exports = { getStats };
