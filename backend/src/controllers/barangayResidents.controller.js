const prisma = require("../lib/prisma");
const { parseCsv } = require("../utils/csv");
const { logAudit } = require("../lib/audit");

const GENDER_VALUES = ["MALE", "FEMALE", "OTHER"];

// Header names are matched case/spacing-insensitively so exports from
// different LGU systems ("Full Name" vs "FULLNAME", "Barangay/Address" vs
// "Address") still line up without requiring an exact template.
function normalizeHeaderKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const FIELD_ALIASES = {
  fullName: ["fullname", "name", "residentname"],
  gender: ["gender", "sex"],
  age: ["age"],
  barangay: ["barangay", "barangayaddress", "address", "barangayresidence"],
  municipality: ["municipality", "city", "citymunicipality", "municipalitycity"],
  status: ["status", "residentstatus"],
  phoneNumber: ["phonenumber", "phone", "contactnumber", "mobilenumber", "mobile"],
};

function pickField(row, field) {
  const normalizedRow = {};
  for (const key of Object.keys(row)) {
    normalizedRow[normalizeHeaderKey(key)] = row[key];
  }
  for (const alias of FIELD_ALIASES[field]) {
    if (normalizedRow[alias] !== undefined && normalizedRow[alias] !== "") return normalizedRow[alias];
  }
  return "";
}

function toResidentRecord(row) {
  const fullName = pickField(row, "fullName").trim();
  if (!fullName) return null;

  const genderRaw = pickField(row, "gender").trim().toUpperCase();
  const gender = GENDER_VALUES.includes(genderRaw)
    ? genderRaw
    : genderRaw.startsWith("M")
    ? "MALE"
    : genderRaw.startsWith("F")
    ? "FEMALE"
    : null;

  const ageRaw = pickField(row, "age").trim();
  const age = ageRaw && !Number.isNaN(Number(ageRaw)) ? Math.round(Number(ageRaw)) : null;

  const barangay = pickField(row, "barangay").trim();
  const municipality = pickField(row, "municipality").trim() || null;
  const status = pickField(row, "status").trim() || "Active";
  const phoneNumber = pickField(row, "phoneNumber").trim() || null;

  return { fullName, gender, age, barangay, municipality, status, phoneNumber };
}

async function search(req, res) {
  const { query } = req.query;
  const trimmed = (query || "").trim();
  if (trimmed.length < 2) return res.json({ residents: [] });

  const residents = await prisma.barangayResident.findMany({
    where: { fullName: { contains: trimmed } },
    orderBy: { fullName: "asc" },
    take: 8,
  });

  res.json({ residents });
}

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const search = (req.query.search || "").trim();
  const where = search ? { fullName: { contains: search } } : {};

  const [rows, total] = await Promise.all([
    prisma.barangayResident.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.barangayResident.count({ where }),
  ]);

  res.json({ rows, total, page, pageSize });
}

async function importCsv(req, res) {
  const { csvText } = req.body;

  const parsedRows = parseCsv(csvText);
  const records = parsedRows.map(toResidentRecord).filter(Boolean);

  if (records.length === 0) {
    return res.status(400).json({
      message:
        "No valid resident rows found. Expect columns for Full Name, Gender, Age, Barangay Address, Municipality, Status, and Phone Number.",
    });
  }

  // A fresh masterlist upload REPLACES the previous one — matches how LGUs
  // hand off "the updated resident list", not an incremental append.
  const result = await prisma.$transaction(async (tx) => {
    await tx.barangayResident.deleteMany({});
    await tx.barangayResident.createMany({ data: records });
    return records.length;
  });

  await logAudit(req, "BARANGAY_MASTERLIST_IMPORTED", `Imported ${result} barangay resident record(s), replacing the previous masterlist`);

  res.status(201).json({ imported: result });
}

module.exports = { search, list, importCsv };
