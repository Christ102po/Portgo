const prisma = require("./prisma");

async function logAudit(req, action, details) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: req.admin?.sub || null,
        adminEmail: req.admin?.email || null,
        adminName: req.admin?.fullName || null,
        action,
        details: details ? String(details) : null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
}

module.exports = { logAudit };
