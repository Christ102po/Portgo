const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");

async function list(req, res) {
  const where = req.query.all === "1" ? {} : { active: true };
  const ships = await prisma.ship.findMany({ where, orderBy: { name: "asc" } });
  res.json({ ships });
}

async function create(req, res) {
  const { name, code, capacity } = req.body;
  if (!name || !code) {
    return res.status(400).json({ message: "Name and code are required" });
  }
  const ship = await prisma.ship.create({
    data: { name, code, ...(capacity !== undefined ? { capacity } : {}) },
  });
  await logAudit(req, "SHIP_CREATED", `Created ship ${name} (${code})`);
  res.status(201).json({ ship });
}

async function update(req, res) {
  const { id } = req.params;
  const { name, code, capacity, active } = req.body;
  const ship = await prisma.ship.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(code !== undefined ? { code } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });
  await logAudit(req, "SHIP_UPDATED", `Updated ship ${ship.name} (${ship.id})`);
  res.json({ ship });
}

async function remove(req, res) {
  const { id } = req.params;
  const ship = await prisma.ship.update({ where: { id }, data: { active: false } });
  await logAudit(req, "SHIP_DEACTIVATED", `Deactivated ship ${ship.name} (${ship.id})`);
  res.json({ ship });
}

async function listClasses(req, res) {
  const { id } = req.params;
  const classes = await prisma.shipClass.findMany({ where: { shipId: id }, orderBy: { className: "asc" } });
  res.json({ classes });
}

async function updateClasses(req, res) {
  const { id } = req.params;
  const { classes } = req.body;

  const ship = await prisma.ship.findUnique({ where: { id } });
  if (!ship) return res.status(404).json({ message: "Ship not found" });

  const cleaned = (classes || []).filter((c) => c.capacity > 0);

  await prisma.$transaction(async (tx) => {
    await tx.shipClass.deleteMany({ where: { shipId: id } });
    for (const c of cleaned) {
      await tx.shipClass.create({ data: { shipId: id, className: c.className, capacity: c.capacity } });
    }
  });

  const updated = await prisma.shipClass.findMany({ where: { shipId: id }, orderBy: { className: "asc" } });
  await logAudit(
    req,
    "SHIP_CLASSES_UPDATED",
    `Updated accommodation classes for ${ship.name}: ${
      updated.map((c) => `${c.className} (${c.capacity})`).join(", ") || "none configured"
    }`
  );
  res.json({ classes: updated });
}

module.exports = { list, create, update, remove, listClasses, updateClasses };
