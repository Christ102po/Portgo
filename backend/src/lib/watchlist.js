const prisma = require("./prisma");

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

async function checkWatchlist(passenger) {
  if (!passenger) return null;
  const entries = await prisma.watchlistEntry.findMany({ where: { active: true } });
  if (entries.length === 0) return null;

  const fullName = normalize(passenger.fullName);
  const passportNumber = normalize(passenger.passportNumber);
  const contactNumber = normalize(passenger.contactNumber);

  for (const entry of entries) {
    if (entry.passportNumber && passportNumber && normalize(entry.passportNumber) === passportNumber) {
      return entry;
    }
    if (entry.contactNumber && contactNumber && normalize(entry.contactNumber) === contactNumber) {
      return entry;
    }
    if (fullName && normalize(entry.fullName) === fullName) {
      return entry;
    }
  }
  return null;
}

module.exports = { checkWatchlist };
