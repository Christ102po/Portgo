function escapeCsvField(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCsvField(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(c.value(row))).join(",")
  );
  return [header, ...lines].join("\r\n");
}

// Minimal RFC 4180-ish CSV parser (handles quoted fields, escaped `""`,
// commas/newlines inside quotes) — the counterpart to escapeCsvField/toCsv
// above. Returns an array of objects keyed by the header row.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = String(text || "").replace(/\r\n/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (nonEmptyRows.length === 0) return [];

  const headers = nonEmptyRows[0].map((h) => h.trim());
  return nonEmptyRows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

module.exports = { toCsv, parseCsv };
