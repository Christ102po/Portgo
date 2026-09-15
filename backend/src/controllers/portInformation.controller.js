const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");

async function listPublic(req, res) {
  const [guidelines, hotlines] = await Promise.all([
    prisma.portGuideline.findMany({
      where: { active: true },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.emergencyHotline.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  res.json({ guidelines, hotlines });
}

async function listAdmin(req, res) {
  const [guidelines, hotlines] = await Promise.all([
    prisma.portGuideline.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.emergencyHotline.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  res.json({ guidelines, hotlines });
}

async function createGuideline(req, res) {
  const { section, text, sortOrder = 0, active = true } = req.body;
  const guideline = await prisma.portGuideline.create({
    data: { section, text: text.trim(), sortOrder, active },
  });
  await logAudit(req, "PORT_GUIDELINE_CREATED", `Added ${section} guideline: ${text}`);
  res.status(201).json({ guideline });
}

async function updateGuideline(req, res) {
  const existing = await prisma.portGuideline.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Guideline not found" });

  const { section, text, sortOrder, active } = req.body;
  const guideline = await prisma.portGuideline.update({
    where: { id: req.params.id },
    data: {
      ...(section !== undefined ? { section } : {}),
      ...(text !== undefined ? { text: text.trim() } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });
  await logAudit(req, "PORT_GUIDELINE_UPDATED", `Updated guideline: ${guideline.text}`);
  res.json({ guideline });
}

async function deleteGuideline(req, res) {
  const existing = await prisma.portGuideline.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Guideline not found" });
  await prisma.portGuideline.delete({ where: { id: req.params.id } });
  await logAudit(req, "PORT_GUIDELINE_DELETED", `Deleted guideline: ${existing.text}`);
  res.status(204).send();
}

async function createHotline(req, res) {
  const { label, number, sortOrder = 0, active = true } = req.body;
  const hotline = await prisma.emergencyHotline.create({
    data: { label: label.trim(), number: number.trim(), sortOrder, active },
  });
  await logAudit(req, "EMERGENCY_HOTLINE_CREATED", `Added emergency hotline: ${label} — ${number}`);
  res.status(201).json({ hotline });
}

async function updateHotline(req, res) {
  const existing = await prisma.emergencyHotline.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Emergency hotline not found" });

  const { label, number, sortOrder, active } = req.body;
  const hotline = await prisma.emergencyHotline.update({
    where: { id: req.params.id },
    data: {
      ...(label !== undefined ? { label: label.trim() } : {}),
      ...(number !== undefined ? { number: number.trim() } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });
  await logAudit(req, "EMERGENCY_HOTLINE_UPDATED", `Updated emergency hotline: ${hotline.label} — ${hotline.number}`);
  res.json({ hotline });
}

async function deleteHotline(req, res) {
  const existing = await prisma.emergencyHotline.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Emergency hotline not found" });
  await prisma.emergencyHotline.delete({ where: { id: req.params.id } });
  await logAudit(req, "EMERGENCY_HOTLINE_DELETED", `Deleted emergency hotline: ${existing.label} — ${existing.number}`);
  res.status(204).send();
}

module.exports = {
  listPublic,
  listAdmin,
  createGuideline,
  updateGuideline,
  deleteGuideline,
  createHotline,
  updateHotline,
  deleteHotline,
};
