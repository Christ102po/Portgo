const prisma = require("../lib/prisma");

async function checkDuplicate(req, res) {
  const { serial } = req.query;
  if (!serial || !serial.trim()) {
    return res.status(400).json({ message: "serial is required" });
  }

  const existing = await prisma.trip.findFirst({
    where: { ticketSerialNumber: serial.trim() },
    select: { id: true, passNumber: true },
  });

  res.json({ duplicate: !!existing });
}

module.exports = { checkDuplicate };
