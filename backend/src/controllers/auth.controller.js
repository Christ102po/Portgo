const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

async function logLogin(admin) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.fullName,
        action: "ADMIN_LOGIN",
        details: `${admin.fullName} (${admin.role}) logged in`,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !admin.active) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { sub: admin.id, role: admin.role, email: admin.email, fullName: admin.fullName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  await logLogin(admin);

  res.json({
    token,
    admin: {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
    },
  });
}

async function me(req, res) {
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.sub } });
  if (!admin || !admin.active) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json({
    admin: {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
    },
  });
}

module.exports = { login, me };
