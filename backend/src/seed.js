require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

const DEFAULT_ADMIN_EMAIL = "admin@portgo.com";

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

const ADMIN_EMAIL = (envValue("SEED_ADMIN_EMAIL") || DEFAULT_ADMIN_EMAIL).toLowerCase();
const ADMIN_PASSWORD =
  envValue("SEED_ADMIN_PASSWORD") || (process.env.NODE_ENV === "production" ? "" : "admin123");

async function seedAdmin() {
  if (!ADMIN_PASSWORD) {
    throw new Error("SEED_ADMIN_PASSWORD is required when seeding in production.");
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const adminByEmail = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } });

  if (adminByEmail) {
    return prisma.admin.update({
      where: { id: adminByEmail.id },
      data: {
        fullName: adminByEmail.fullName || "Port Administrator",
        passwordHash,
        role: "SUPER_ADMIN",
        active: true,
      },
    });
  }

  // Older PORTGO database dumps may contain a SUPER_ADMIN with a different id
  // (or a previously changed email). Reuse it instead of creating duplicates.
  const existingSuperAdmin = await prisma.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (existingSuperAdmin) {
    return prisma.admin.update({
      where: { id: existingSuperAdmin.id },
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        active: true,
        role: "SUPER_ADMIN",
      },
    });
  }

  return prisma.admin.create({
    data: {
      fullName: "Port Administrator",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "SUPER_ADMIN",
      active: true,
    },
  });
}

async function main() {
  await seedAdmin();

  const surigaoStar = await prisma.ship.upsert({
    where: { code: "SHIP-01" },
    update: {},
    create: { name: "MV Surigao Star", code: "SHIP-01" },
  });

  const dapaExpress = await prisma.ship.upsert({
    where: { code: "SHIP-02" },
    update: {},
    create: { name: "MV Dapa Express", code: "SHIP-02" },
  });

  const scheduleSeeds = [
    { route: "SURIGAO_TO_DAPA", departureTime: "06:00 AM", daysOfWeek: "Mon-Sun", shipId: surigaoStar.id },
    { route: "SURIGAO_TO_DAPA", departureTime: "01:00 PM", daysOfWeek: "Mon-Sun", shipId: surigaoStar.id },
    { route: "DAPA_TO_SURIGAO", departureTime: "08:00 AM", daysOfWeek: "Mon-Sun", shipId: dapaExpress.id },
    { route: "DAPA_TO_SURIGAO", departureTime: "03:00 PM", daysOfWeek: "Mon-Sun", shipId: dapaExpress.id },
  ];

  for (const s of scheduleSeeds) {
    const existing = await prisma.schedule.findFirst({
      where: { route: s.route, departureTime: s.departureTime, shipId: s.shipId },
    });
    if (!existing) {
      await prisma.schedule.create({ data: s });
    }
  }

  console.log("Seed complete.");
  console.log(`Admin email: ${ADMIN_EMAIL}`);
  console.log("Admin password synchronized from SEED_ADMIN_PASSWORD (password is not printed for security). ");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
