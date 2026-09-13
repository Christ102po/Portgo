const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");

const SAFE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

async function list(req, res) {
  const admins = await prisma.admin.findMany({
    select: SAFE_SELECT,
    orderBy: { createdAt: "asc" },
  });
  res.json({ admins });
}

async function create(req, res) {
  const { fullName, email, password, role } = req.body;

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: "An account with this email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: { fullName, email, passwordHash, role },
    select: SAFE_SELECT,
  });

  await logAudit(req, "STAFF_CREATED", `Created staff account ${fullName} (${email}, ${role})`);

  res.status(201).json({ admin });
}

async function update(req, res) {
  const { id } = req.params;
  const { fullName, role, active } = req.body;

  if (id === req.admin.sub && active === false) {
    return res.status(400).json({ message: "You cannot deactivate your own account" });
  }
  if (id === req.admin.sub && role && role !== "SUPER_ADMIN") {
    return res.status(400).json({ message: "You cannot change your own role" });
  }

  const admin = await prisma.admin.update({
    where: { id },
    data: {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(active !== undefined ? { active } : {}),
    },
    select: SAFE_SELECT,
  });

  await logAudit(req, "STAFF_UPDATED", `Updated staff account ${admin.fullName} (${admin.email})`);

  res.json({ admin });
}

async function resetPassword(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.update({
    where: { id },
    data: { passwordHash },
    select: SAFE_SELECT,
  });

  await logAudit(req, "STAFF_PASSWORD_RESET", `Reset password for ${admin.fullName} (${admin.email})`);

  res.json({ admin });
}

module.exports = { list, create, update, resetPassword };
