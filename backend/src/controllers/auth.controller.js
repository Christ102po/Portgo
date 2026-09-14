const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const DEFAULT_SEED_ADMIN_EMAIL = "admin@portgo.com";

function envValue(name) {
  let value = String(process.env[name] || "").trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function seedAdminEmail() {
  return (envValue("SEED_ADMIN_EMAIL") || DEFAULT_SEED_ADMIN_EMAIL).toLowerCase();
}

function seedAdminPassword() {
  return envValue("SEED_ADMIN_PASSWORD");
}

function safeSecretEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

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

/**
 * SEED_ADMIN_PASSWORD is also treated as the emergency recovery credential for
 * admin@portgo.com. This solves a common Railway deployment problem where the
 * environment variable is changed but `npm run seed` is never executed against
 * the production database.
 *
 * The recovery credential is accepted only for the configured seed-admin email.
 * When it is used successfully, the database bcrypt hash is synchronized so
 * normal bcrypt login works from that point onward.
 */
async function recoverSeedAdminIfNeeded(normalizedEmail, suppliedPassword, currentAdmin) {
  const configuredEmail = seedAdminEmail();
  const configuredPassword = seedAdminPassword();

  if (
    normalizedEmail !== configuredEmail ||
    !configuredPassword ||
    !safeSecretEqual(suppliedPassword, configuredPassword)
  ) {
    return currentAdmin;
  }

  const passwordHash = await bcrypt.hash(configuredPassword, 10);

  if (currentAdmin) {
    const needsRepair =
      !currentAdmin.active ||
      currentAdmin.role !== "SUPER_ADMIN" ||
      !(await bcrypt.compare(configuredPassword, currentAdmin.passwordHash));

    if (!needsRepair) return currentAdmin;

    const repaired = await prisma.admin.update({
      where: { id: currentAdmin.id },
      data: {
        passwordHash,
        active: true,
        role: "SUPER_ADMIN",
      },
    });
    console.warn("[Auth] Seed-admin recovery credential synchronized with the database.");
    return repaired;
  }

  // If an older database contains a super-admin under a different email, repair
  // that record instead of creating a duplicate privileged account.
  const existingSuperAdmin = await prisma.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (existingSuperAdmin) {
    const repaired = await prisma.admin.update({
      where: { id: existingSuperAdmin.id },
      data: {
        fullName: existingSuperAdmin.fullName || "Port Administrator",
        email: configuredEmail,
        passwordHash,
        active: true,
        role: "SUPER_ADMIN",
      },
    });
    console.warn("[Auth] Existing super-admin was repaired using SEED_ADMIN_PASSWORD.");
    return repaired;
  }

  const created = await prisma.admin.create({
    data: {
      fullName: "Port Administrator",
      email: configuredEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      active: true,
    },
  });
  console.warn("[Auth] Missing seed admin was recreated using SEED_ADMIN_PASSWORD.");
  return created;
}

async function login(req, res) {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  let admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

  // First try the regular bcrypt credential when an account exists.
  let valid = false;
  if (admin && admin.active) {
    valid = await bcrypt.compare(password, admin.passwordHash);
  }

  // If regular login fails, allow the configured seed credential to repair the
  // production admin record. This does not expose the secret and only applies to
  // the configured seed-admin email.
  if (!valid) {
    admin = await recoverSeedAdminIfNeeded(normalizedEmail, password, admin);
    if (admin && admin.active) {
      valid = await bcrypt.compare(password, admin.passwordHash);
    }
  }

  if (!admin || !admin.active || !valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const jwtSecret = envValue("JWT_SECRET");
  if (!jwtSecret) {
    console.error("[Auth] JWT_SECRET is missing.");
    return res.status(500).json({ message: "Server authentication is not configured" });
  }

  const token = jwt.sign(
    { sub: admin.id, role: admin.role, email: admin.email, fullName: admin.fullName },
    jwtSecret,
    { expiresIn: envValue("JWT_EXPIRES_IN") || "8h" }
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
