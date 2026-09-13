const PDFDocument = require("pdfkit");

const GRAPHITE = "#18251D";
const MINT = "#B7FF72";
const SLATE = "#475569";
const LIGHT_BORDER = "#E2E8F0";

const COLUMNS = [
  { label: "#", width: 24 },
  { label: "Pass Number", width: 90 },
  { label: "Passenger", width: 100 },
  { label: "Type", width: 50 },
  { label: "Dir.", width: 45 },
  { label: "Ship", width: 90 },
  { label: "Status", width: 55 },
  { label: "Date/Time", width: 82 },
];

const PASSENGER_TYPE_LABEL = {
  LOCAL_RESIDENT: "Resident",
  LOCAL_TOURIST: "Local Tourist",
  FOREIGN_TOURIST: "Foreign",
};

function formatRoute(route) {
  return route === "SURIGAO_TO_DAPA" ? "Surigao to Dapa" : "Dapa to Surigao";
}

function drawHeader(doc, { range, query, total }) {
  doc.rect(0, 0, doc.page.width, 90).fill(GRAPHITE);
  doc
    .fillColor(MINT)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("PORTGO", 40, 26, { characterSpacing: 1.5 });
  doc
    .fillColor("#FFFFFF")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Official Passenger Manifest", 40, 42);
  doc
    .fillColor("#CBD5E1")
    .fontSize(9)
    .font("Helvetica")
    .text("Surigao – Dapa Port Passenger Monitoring System", 40, 64);

  const periodLabel = `${range.start.toISOString().slice(0, 10)} to ${new Date(range.end.getTime() - 86400000).toISOString().slice(0, 10)}`;
  doc
    .fillColor("#FFFFFF")
    .fontSize(9)
    .text(`Reporting Period: ${periodLabel}`, 0, 26, { align: "right", width: doc.page.width - 40 })
    .text(`Total Records: ${total}`, 0, 40, { align: "right", width: doc.page.width - 40 })
    .text(`Generated: ${new Date().toLocaleString()}`, 0, 54, { align: "right", width: doc.page.width - 40 });

  doc.y = 110;
}

function drawTableHeader(doc, startX) {
  let x = startX;
  const y = doc.y;
  doc.rect(startX, y, COLUMNS.reduce((s, c) => s + c.width, 0), 20).fill("#F1F5F9");
  doc.fillColor(GRAPHITE).font("Helvetica-Bold").fontSize(8);
  for (const col of COLUMNS) {
    doc.text(col.label, x + 4, y + 6, { width: col.width - 6, ellipsis: true });
    x += col.width;
  }
  doc.y = y + 20;
}

function ensureSpace(doc, startX, rowHeight) {
  if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 60) {
    doc.addPage();
    doc.y = 40;
    drawTableHeader(doc, startX);
  }
}

function drawRow(doc, startX, row, index) {
  const rowHeight = 18;
  ensureSpace(doc, startX, rowHeight);
  const y = doc.y;

  if (index % 2 === 0) {
    doc.rect(startX, y, COLUMNS.reduce((s, c) => s + c.width, 0), rowHeight).fill("#FAFAFA");
  }

  doc.fillColor("#0F172A").font("Helvetica").fontSize(7.5);
  let x = startX;
  const cells = [
    String(index + 1),
    row.passNumber,
    row.passenger.fullName,
    PASSENGER_TYPE_LABEL[row.passenger.passengerType] || row.passenger.passengerType,
    row.transactionType === "SIGN_IN" ? "OUT" : "IN",
    row.ship.name,
    row.status,
    new Date(row.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  ];
  cells.forEach((text, i) => {
    doc.text(String(text ?? ""), x + 4, y + 5, { width: COLUMNS[i].width - 6, ellipsis: true });
    x += COLUMNS[i].width;
  });

  doc
    .moveTo(startX, y + rowHeight)
    .lineTo(startX + COLUMNS.reduce((s, c) => s + c.width, 0), y + rowHeight)
    .strokeColor(LIGHT_BORDER)
    .lineWidth(0.5)
    .stroke();

  doc.y = y + rowHeight;
}

function drawSummaryBlock(doc, trips) {
  const local = trips.filter((t) => t.passenger.passengerType !== "FOREIGN_TOURIST").length;
  const tourist = trips.filter((t) => t.passenger.passengerType === "FOREIGN_TOURIST").length;
  const signIns = trips.filter((t) => t.transactionType === "SIGN_IN").length;
  const signOuts = trips.filter((t) => t.transactionType === "SIGN_OUT").length;
  const cancelled = trips.filter((t) => t.status === "CANCELLED").length;
  const noShow = trips.filter((t) => t.status === "NO_SHOW").length;

  const stats = [
    ["Total Passengers", trips.length],
    ["Local / Tourist", `${local} / ${tourist}`],
    ["Sign-In / Sign-Out", `${signIns} / ${signOuts}`],
    ["Cancelled / No-Show", `${cancelled} / ${noShow}`],
  ];

  let x = 40;
  const boxWidth = 128;
  stats.forEach(([label, value]) => {
    doc.roundedRect(x, doc.y, boxWidth - 8, 44, 6).fillAndStroke("#F8FAFC", LIGHT_BORDER);
    doc.fillColor(SLATE).font("Helvetica").fontSize(7).text(label.toUpperCase(), x + 8, doc.y + 8, { width: boxWidth - 24 });
    doc.fillColor(GRAPHITE).font("Helvetica-Bold").fontSize(13).text(String(value), x + 8, doc.y + 20);
    x += boxWidth;
  });
  doc.y += 56;
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const bottom = doc.page.height - 50;
    doc
      .moveTo(40, bottom)
      .lineTo(doc.page.width - 40, bottom)
      .strokeColor(LIGHT_BORDER)
      .stroke();
    doc
      .fontSize(7)
      .fillColor(SLATE)
      .font("Helvetica")
      .text("Generated by PORTGO — Passenger Monitoring System. For official Port Authority / Coast Guard submission.", 40, bottom + 8, { width: doc.page.width - 200, lineBreak: false })
      .text(`Page ${i + 1} of ${range.count}`, doc.page.width - 140, bottom + 8, { width: 100, align: "right", lineBreak: false });

    doc.page.margins.bottom = originalBottomMargin;
  }
}

function streamManifest(res, { trips, range, query }) {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="portgo-manifest-${range.start.toISOString().slice(0, 10)}.pdf"`
  );
  doc.pipe(res);

  drawHeader(doc, { range, query, total: trips.length });
  drawSummaryBlock(doc, trips);

  const startX = 40;
  if (trips.length === 0) {
    doc.fillColor(SLATE).font("Helvetica").fontSize(10).text("No passenger records found for this reporting period.", startX, doc.y + 10);
  } else {
    drawTableHeader(doc, startX);
    trips.forEach((trip, idx) => drawRow(doc, startX, trip, idx));
  }

  drawFooter(doc);
  doc.end();
}

module.exports = { streamManifest };
