const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");

async function list(req, res) {
  const entries = await prisma.watchlistEntry.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ entries });
}

async function create(req, res) {
  const { fullName, passportNumber, contactNumber, reason } = req.body;
  const entry = await prisma.watchlistEntry.create({
    data: {
      fullName,
      passportNumber: passportNumber || null,
      contactNumber: contactNumber || null,
      reason,
      createdBy: req.admin?.email || null,
    },
  });
  await logAudit(req, "WATCHLIST_ENTRY_CREATED", `Added "${fullName}" to the security watchlist — ${reason}`);
  res.status(201).json({ entry });
}

async function update(req, res) {
  const { id } = req.params;
  const { fullName, passportNumber, contactNumber, reason, active } = req.body;
  const entry = await prisma.watchlistEntry.update({
    where: { id },
    data: {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(passportNumber !== undefined ? { passportNumber: passportNumber || null } : {}),
      ...(contactNumber !== undefined ? { contactNumber: contactNumber || null } : {}),
      ...(reason !== undefined ? { reason } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });
  await logAudit(
    req,
    active === false ? "WATCHLIST_ENTRY_DEACTIVATED" : "WATCHLIST_ENTRY_UPDATED",
    `Updated watchlist entry for "${entry.fullName}"`
  );
  res.json({ entry });
}

async function remove(req, res) {
  const { id } = req.params;
  const entry = await prisma.watchlistEntry.findUnique({ where: { id } });
  if (!entry) return res.status(404).json({ message: "Watchlist entry not found" });
  await prisma.watchlistEntry.delete({ where: { id } });
  await logAudit(req, "WATCHLIST_ENTRY_DELETED", `Removed "${entry.fullName}" from the security watchlist`);
  res.status(204).send();
}

module.exports = { list, create, update, remove };
