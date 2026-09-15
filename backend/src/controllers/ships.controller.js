const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");

const CLASS_ORDER = ["ECONOMY", "TOURIST_AIRCON", "BUSINESS"];

function normalizeClasses(classes = [], shipCapacity = null) {
  const seen = new Set();
  const cleaned = [];

  for (const item of Array.isArray(classes) ? classes : []) {
    const className = String(item?.className || "").trim();
    const capacity = Number(item?.capacity || 0);
    if (!CLASS_ORDER.includes(className) || seen.has(className) || !Number.isInteger(capacity) || capacity <= 0) continue;
    seen.add(className);
    cleaned.push({ className, capacity });
  }

  cleaned.sort((a, b) => CLASS_ORDER.indexOf(a.className) - CLASS_ORDER.indexOf(b.className));

  if (shipCapacity != null) {
    const total = cleaned.reduce((sum, c) => sum + c.capacity, 0);
    if (total > shipCapacity) {
      const err = new Error(`Accommodation class capacities total ${total}, which is greater than the ship capacity of ${shipCapacity}.`);
      err.status = 400;
      throw err;
    }
  }

  return cleaned;
}

function enrichShip(ship) {
  const classes = Array.isArray(ship.classes) ? ship.classes : [];
  return {
    ...ship,
    classes,
    hasAccommodationTypes: classes.length > 0,
    accommodationMode: classes.length > 0 ? "MULTIPLE" : "ECONOMY_ONLY",
  };
}

async function replaceClasses(tx, shipId, classes) {
  await tx.shipClass.deleteMany({ where: { shipId } });
  for (const item of classes) {
    await tx.shipClass.create({ data: { shipId, className: item.className, capacity: item.capacity } });
  }
}

async function list(req, res) {
  const where = req.query.all === "1" ? {} : { active: true };
  const ships = await prisma.ship.findMany({
    where,
    include: { classes: true },
    orderBy: { name: "asc" },
  });
  res.json({ ships: ships.map(enrichShip) });
}

async function create(req, res) {
  const { name, code, capacity, classes } = req.body;
  if (!name || !code) {
    return res.status(400).json({ message: "Name and code are required" });
  }

  const shipCapacity = capacity !== undefined ? Number(capacity) : 100;
  let cleanedClasses;
  try {
    cleanedClasses = normalizeClasses(classes, shipCapacity);
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  const ship = await prisma.$transaction(async (tx) => {
    const created = await tx.ship.create({ data: { name, code, capacity: shipCapacity } });
    await replaceClasses(tx, created.id, cleanedClasses);
    return tx.ship.findUnique({ where: { id: created.id }, include: { classes: true } });
  });

  await logAudit(
    req,
    "SHIP_CREATED",
    `Created ship ${name} (${code}) — ${cleanedClasses.length ? `${cleanedClasses.length} configured accommodation type(s)` : "Economy only"}`
  );
  res.status(201).json({ ship: enrichShip(ship) });
}

async function update(req, res) {
  const { id } = req.params;
  const { name, code, capacity, active, classes } = req.body;
  const current = await prisma.ship.findUnique({ where: { id }, include: { classes: true } });
  if (!current) return res.status(404).json({ message: "Ship not found" });

  const nextCapacity = capacity !== undefined ? Number(capacity) : current.capacity;
  let cleanedClasses = null;
  if (classes !== undefined) {
    try {
      cleanedClasses = normalizeClasses(classes, nextCapacity);
    } catch (err) {
      return res.status(err.status || 400).json({ message: err.message });
    }
  } else if (capacity !== undefined && current.classes.length) {
    try {
      normalizeClasses(current.classes, nextCapacity);
    } catch (err) {
      return res.status(err.status || 400).json({ message: err.message });
    }
  }

  const ship = await prisma.$transaction(async (tx) => {
    await tx.ship.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(capacity !== undefined ? { capacity: nextCapacity } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });
    if (cleanedClasses !== null) await replaceClasses(tx, id, cleanedClasses);
    return tx.ship.findUnique({ where: { id }, include: { classes: true } });
  });

  await logAudit(req, "SHIP_UPDATED", `Updated ship ${ship.name} (${ship.id})`);
  res.json({ ship: enrichShip(ship) });
}

async function remove(req, res) {
  const { id } = req.params;
  const ship = await prisma.ship.update({ where: { id }, data: { active: false } });
  await logAudit(req, "SHIP_DEACTIVATED", `Deactivated ship ${ship.name} (${ship.id})`);
  res.json({ ship });
}

async function listClasses(req, res) {
  const { id } = req.params;
  const ship = await prisma.ship.findUnique({ where: { id } });
  if (!ship) return res.status(404).json({ message: "Ship not found" });
  const classes = await prisma.shipClass.findMany({ where: { shipId: id }, orderBy: { className: "asc" } });
  res.json({ classes, hasAccommodationTypes: classes.length > 0, accommodationMode: classes.length ? "MULTIPLE" : "ECONOMY_ONLY" });
}

async function updateClasses(req, res) {
  const { id } = req.params;
  const { classes } = req.body;

  const ship = await prisma.ship.findUnique({ where: { id } });
  if (!ship) return res.status(404).json({ message: "Ship not found" });

  let cleaned;
  try {
    cleaned = normalizeClasses(classes, ship.capacity);
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  await prisma.$transaction(async (tx) => {
    await replaceClasses(tx, id, cleaned);
  });

  const updated = await prisma.shipClass.findMany({ where: { shipId: id }, orderBy: { className: "asc" } });
  await logAudit(
    req,
    "SHIP_CLASSES_UPDATED",
    `Updated accommodation setup for ${ship.name}: ${
      updated.map((c) => `${c.className} (${c.capacity})`).join(", ") || "Economy only (ship-wide capacity)"
    }`
  );
  res.json({ classes: updated, hasAccommodationTypes: updated.length > 0, accommodationMode: updated.length ? "MULTIPLE" : "ECONOMY_ONLY" });
}

module.exports = { list, create, update, remove, listClasses, updateClasses };
