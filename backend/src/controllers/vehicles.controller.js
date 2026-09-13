const prisma = require("../lib/prisma");

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const { shipId, vehicleType, date, search } = req.query;

  const where = {
    hasVehicle: true,
    ...(shipId ? { shipId } : {}),
    ...(vehicleType ? { vehicleType } : {}),
  };

  if (date) {
    const start = new Date(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  if (search) {
    where.OR = [
      { plateNumber: { contains: search } },
      { passenger: { fullName: { contains: search } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: { passenger: true, ship: true, schedule: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trip.count({ where }),
  ]);

  res.json({ rows, total, page, pageSize });
}

module.exports = { list };
