const prisma = require("../lib/prisma");
const { getManifestData } = require("../lib/manifest");
const { streamCoastGuardManifest } = require("../lib/pdfCoastGuardManifest");
const { logAudit } = require("../lib/audit");

async function getManifest(req, res) {
  const data = await getManifestData(req.params.id);
  if (!data) return res.status(404).json({ message: "Schedule not found" });
  res.json(data);
}

async function exportManifest(req, res) {
  const data = await getManifestData(req.params.id);
  if (!data) return res.status(404).json({ message: "Schedule not found" });

  await logAudit(
    req,
    "MANIFEST_EXPORTED",
    `Exported PCG manifest for ${data.ship.name} at ${data.schedule.departureTime} (${data.trips.length} passengers)`
  );

  streamCoastGuardManifest(res, data);
}

async function signOff(req, res) {
  const { id } = req.params;
  const { officerName, badgeNumber, signatureDataUrl } = req.body;

  const schedule = await prisma.schedule.findUnique({ where: { id } });
  if (!schedule) return res.status(404).json({ message: "Schedule not found" });

  const record = await prisma.manifestSignOff.upsert({
    where: { scheduleId: id },
    update: {
      officerName,
      badgeNumber,
      signatureDataUrl,
      adminId: req.admin?.sub || null,
      adminName: req.admin?.fullName || null,
      signedAt: new Date(),
    },
    create: {
      scheduleId: id,
      officerName,
      badgeNumber,
      signatureDataUrl,
      adminId: req.admin?.sub || null,
      adminName: req.admin?.fullName || null,
    },
  });

  await logAudit(
    req,
    "MANIFEST_SIGNED_OFF",
    `PCG Inspection Sign-Off recorded for ${schedule.departureTime} sailing by ${officerName} (Badge #${badgeNumber})`
  );

  res.status(201).json({ signOff: record });
}

module.exports = { getManifest, exportManifest, signOff };
