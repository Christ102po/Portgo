require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

const DEV_ADMIN_EMAIL = "admin@portgo.com";
const DEV_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin123");
const SEEDED_ADMIN_ID = "cmsrmot0e0000qcmcxze7b287";

async function main() {
  if (!DEV_ADMIN_PASSWORD) {
    throw new Error("SEED_ADMIN_PASSWORD is required when seeding in production.");
  }
  const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 10);

  const existingAdmin = await prisma.admin.findUnique({ where: { id: SEEDED_ADMIN_ID } });
  if (existingAdmin) {
    await prisma.admin.update({
      where: { id: SEEDED_ADMIN_ID },
      data: { email: DEV_ADMIN_EMAIL, passwordHash },
    });
  } else {
    await prisma.admin.upsert({
      where: { email: DEV_ADMIN_EMAIL },
      update: { passwordHash },
      create: {
        fullName: "Port Administrator",
        email: DEV_ADMIN_EMAIL,
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });
  }

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
  console.log(`Dev admin login -> email: ${DEV_ADMIN_EMAIL}  password: ${DEV_ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
