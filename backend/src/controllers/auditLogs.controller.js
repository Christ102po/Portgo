const prisma = require("../lib/prisma");

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const { search } = req.query;

  const where = search
    ? {
        OR: [
          { action: { contains: search } },
          { adminEmail: { contains: search } },
          { adminName: { contains: search } },
          { details: { contains: search } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ rows, total, page, pageSize });
}

module.exports = { list };
