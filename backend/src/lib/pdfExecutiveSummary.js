const PDFDocument = require("pdfkit");

const GRAPHITE = "#18251D";
const MINT = "#B7FF72";
const SLATE = "#475569";
const LIGHT_BORDER = "#E2E8F0";
const PANEL_BG = "#F8FAFC";

const PERIODS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

const METRIC_ROWS = [
  { key: "totalPassengers", label: "Total Passengers" },
  { key: "localCount", label: "Local Passengers" },
  { key: "touristCount", label: "Tourist Passengers" },
  { key: "signIns", label: "Sign-Ins (to Dapa)" },
  { key: "signOuts", label: "Sign-Outs (to Surigao)" },
  { key: "boarded", label: "Boarded" },
  { key: "cancelled", label: "Cancelled" },
  { key: "noShow", label: "No-Show" },
];

function drawHeader(doc, { generatedBy }) {
  doc.rect(0, 0, doc.page.width, 92).fill(GRAPHITE);
  doc.fillColor(MINT).fontSize(10).font("Helvetica-Bold").text("PORTGO", 40, 22, { characterSpacing: 1.5 });
  doc.fillColor("#FFFFFF").fontSize(17).font("Helvetica-Bold").text("Port Executive Summary Report", 40, 37);
  doc
    .fillColor("#CBD5E1")
    .fontSize(9)
    .font("Helvetica")
    .text("Surigao – Dapa Port Passenger Monitoring System — Philippine Ports Authority", 40, 60);

  doc
    .fillColor("#FFFFFF")
    .fontSize(8.5)
    .font("Helvetica")
    .text(`Generated: ${new Date().toLocaleString()}`, 0, 26, { align: "right", width: doc.page.width - 40 })
    .text(`Prepared by: ${generatedBy || "Port Administrator"}`, 0, 40, {
      align: "right",
      width: doc.page.width - 40,
    });

  doc.y = 116;
}

function drawKpiCards(doc, data) {
  const startX = 40;
  const gap = 12;
  const cardWidth = (doc.page.width - 80 - gap * 2) / 3;
  const y = doc.y;

  PERIODS.forEach((p, i) => {
    const x = startX + i * (cardWidth + gap);
    const stats = data[p.key];
    doc.roundedRect(x, y, cardWidth, 78, 8).fillAndStroke(PANEL_BG, LIGHT_BORDER);
    doc
      .fillColor(SLATE)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(p.label.toUpperCase(), x + 12, y + 12, { width: cardWidth - 24 });
    doc
      .fillColor(GRAPHITE)
      .font("Helvetica-Bold")
      .fontSize(26)
      .text(String(stats.totalPassengers), x + 12, y + 26);
    doc
      .fillColor(SLATE)
      .font("Helvetica")
      .fontSize(8)
      .text(`Local ${stats.localCount} · Tourist ${stats.touristCount}`, x + 12, y + 58, {
        width: cardWidth - 24,
      });
  });

  doc.y = y + 94;
}

function drawComparisonTable(doc) {
  const startX = 40;
  const labelWidth = 190;
  const colWidth = (doc.page.width - 80 - labelWidth) / 3;
  let y = doc.y;

  doc.fillColor(GRAPHITE).font("Helvetica-Bold").fontSize(10).text("PERIOD COMPARISON", startX, y);
  y += 18;

  doc.rect(startX, y, doc.page.width - 80, 20).fill("#F1F5F9");
  doc.fillColor(GRAPHITE).font("Helvetica-Bold").fontSize(8);
  doc.text("Metric", startX + 6, y + 6, { width: labelWidth - 12 });
  PERIODS.forEach((p, i) => {
    doc.text(p.label, startX + labelWidth + i * colWidth + 6, y + 6, { width: colWidth - 12, align: "right" });
  });
  y += 20;

  return { startX, labelWidth, colWidth, y };
}

function drawComparisonRows(doc, data, layout) {
  const { startX, labelWidth, colWidth } = layout;
  let y = layout.y;
  const rowHeight = 17;

  METRIC_ROWS.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.rect(startX, y, doc.page.width - 80, rowHeight).fill("#FAFAFA");
    }
    doc.fillColor("#0F172A").font("Helvetica").fontSize(8.5);
    doc.text(row.label, startX + 6, y + 4, { width: labelWidth - 12 });
    PERIODS.forEach((p, i) => {
      doc
        .font("Helvetica-Bold")
        .text(String(data[p.key][row.key]), startX + labelWidth + i * colWidth + 6, y + 4, {
          width: colWidth - 12,
          align: "right",
        });
    });
    doc
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + (doc.page.width - 80), y + rowHeight)
      .strokeColor(LIGHT_BORDER)
      .lineWidth(0.5)
      .stroke();
    y += rowHeight;
  });

  doc.y = y + 22;
}

function drawSplitBars(doc, data) {
  const startX = 40;
  const barWidth = doc.page.width - 80 - 130;
  let y = doc.y;

  doc.fillColor(GRAPHITE).font("Helvetica-Bold").fontSize(10).text("LOCAL VS. TOURIST SPLIT", startX, y);
  y += 20;

  PERIODS.forEach((p) => {
    const stats = data[p.key];
    const total = stats.localCount + stats.touristCount;
    const localWidth = total > 0 ? (stats.localCount / total) * barWidth : 0;
    const touristWidth = total > 0 ? barWidth - localWidth : 0;

    doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(8).text(p.label, startX, y + 5, { width: 90 });

    const barX = startX + 100;
    doc.roundedRect(barX, y, barWidth, 16, 4).fill("#EEF2F6");
    if (total > 0) {
      doc.rect(barX, y, Math.max(localWidth, 2), 16).fill(GRAPHITE);
      doc.rect(barX + localWidth, y, Math.max(touristWidth, 2), 16).fill(MINT);
    }
    doc
      .fillColor(SLATE)
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        total > 0 ? `Local ${stats.localCount} (${Math.round((stats.localCount / total) * 100)}%) · Tourist ${stats.touristCount} (${Math.round((stats.touristCount / total) * 100)}%)` : "No passenger data",
        barX,
        y + 20,
        { width: barWidth }
      );

    y += 40;
  });

  doc.y = y + 8;
}

function drawFooter(doc) {
  const bottom = doc.page.height - 70;
  doc
    .moveTo(40, bottom)
    .lineTo(doc.page.width - 40, bottom)
    .strokeColor(LIGHT_BORDER)
    .stroke();
  doc
    .fontSize(7.5)
    .fillColor(SLATE)
    .font("Helvetica")
    .text(
      "This executive summary is system-generated by PORTGO for internal Port Authority reporting. Figures reflect passenger trip records as of the generation timestamp above.",
      40,
      bottom + 8,
      { width: doc.page.width - 80 }
    );

  doc
    .fontSize(7.5)
    .fillColor(GRAPHITE)
    .text("_______________________________", doc.page.width - 260, bottom - 26, { width: 220, align: "right" })
    .text("Port Administrator / Authorized Signatory", doc.page.width - 260, bottom - 14, {
      width: 220,
      align: "right",
    });
}

function streamExecutiveSummary(res, { week, month, year, generatedBy }) {
  const data = { week, month, year };
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="portgo-executive-summary-${new Date().toISOString().slice(0, 10)}.pdf"`
  );
  doc.pipe(res);

  drawHeader(doc, { generatedBy });
  drawKpiCards(doc, data);
  const layout = drawComparisonTable(doc);
  drawComparisonRows(doc, data, layout);
  drawSplitBars(doc, data);
  drawFooter(doc);

  doc.end();
}

module.exports = { streamExecutiveSummary };
