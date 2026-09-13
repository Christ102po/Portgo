const { seedDemoPassengers } = require("../lib/demoSeeder");
const { logAudit } = require("../lib/audit");

async function seedDemo(req, res) {
  const count = Math.min(300, Math.max(10, parseInt(req.body?.count, 10) || 100));

  try {
    const result = await seedDemoPassengers({ count });
    await logAudit(
      req,
      "DEMO_SEED",
      `Seeded ${result.created} sample passenger record(s) for demo/presentation purposes`
    );
    res.status(201).json(result);
  } catch (err) {
    if (err.code === "NO_SHIPS_OR_SCHEDULES") {
      return res.status(400).json({ message: err.message });
    }
    throw err;
  }
}

module.exports = { seedDemo };
