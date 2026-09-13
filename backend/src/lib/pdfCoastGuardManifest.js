const PDFDocument = require("pdfkit");

const GRAPHITE = "#18251D";
const MINT = "#B7FF72";
const SLATE = "#475569";
const LIGHT_BORDER = "#E2E8F0";

const PASSENGER_COLUMNS = [
  { label: "#", width: 18 },
  { label: "Full Name", width: 122 },
  { label: "Age", width: 26 },
  { label: "Gender", width: 42 },
  { label: "Category", width: 68 },
  { label: "Direction", width: 72 },
  { label: "Class", width: 60 },
  { label: "Verification", width: 80 },
  { label: "Priority", width: 72 },
  { label: "Group", width: 50 },
  { label: "Emergency Contact", width: 98 },
  { label: "Status", width: 54 },
];

const VEHICLE_COLUMNS = [
  { label: "#", width: 24 },
  { label: "Plate Number", width: 110 },
  { label: "Vehicle Type", width: 120 },
  { label: "Driver / Passenger", width: 160 },
  { label: "Category", width: 80 },
  { label: "Status", width: 80 },
];

const VEHICLE_TYPE_LABEL = {
  MOTORCYCLE: "Motorcycle",
  SEDAN_SUV: "Sedan / SUV",
  TRUCK_CARGO: "Truck / Cargo",
};

const STATUS_LABEL = {
  ACTIVE: "Confirmed",
  BOARDED: "Boarded",
  NO_SHOW: "No-Show",
};

// Direction is relative to the home terminal this system is installed at.
const HOME_PORT = process.env.PORT_NAME || "Surigao";
const DIRECTION_LABEL = {
  SIGN_IN: `Outbound (Departing ${HOME_PORT})`,
  SIGN_OUT: `Inbound (Arriving ${HOME_PORT})`,
};

const CLASS_LABEL = {
  ECONOMY: "Economy",
  TOURIST_AIRCON: "Tourist A/C",
  BUSINESS: "Business",
};

function routeLabel(route) {
  return route === "SURIGAO_TO_DAPA" ? "Surigao to Dapa" : "Dapa to Surigao";
}

function priorityFlags(p) {
  const flags = [];
  if (p.isMedicalEmergency) flags.push("Medical Emergency");
  if (p.isSeniorCitizen) flags.push("Senior");
  if (p.isPWD) flags.push("PWD");
  if (p.isPregnant) flags.push("Pregnant");
  if (p.needsWheelchair) flags.push("Wheelchair");
  if (p.isStudent) flags.push("Student");
  if (p.isInfant) flags.push("Infant");
  return flags.join(", ") || "—";
}

function countPriorityTotals(trips) {
  const totals = { Medical: 0, Senior: 0, PWD: 0, Pregnant: 0, Wheelchair: 0, Student: 0, Infant: 0, Minor: 0 };
  for (const trip of trips) {
    const p = trip.passenger;
    if (p.isMedicalEmergency) totals.Medical += 1;
    if (p.isSeniorCitizen) totals.Senior += 1;
    if (p.isPWD) totals.PWD += 1;
    if (p.isPregnant) totals.Pregnant += 1;
    if (p.needsWheelchair) totals.Wheelchair += 1;
    if (p.isStudent) totals.Student += 1;
    if (p.isInfant) totals.Infant += 1;
    else if (p.age != null && Number(p.age) < 18) totals.Minor += 1;
  }
  return totals;
}

const PASSENGER_TYPE_LABEL = {
  LOCAL_RESIDENT: "Local Resident",
  LOCAL_TOURIST: "Local Tourist",
  FOREIGN_TOURIST: "Foreign Tourist",
};

function verificationLabel(p) {
  if (p.passengerType === "FOREIGN_TOURIST") {
    if (p.isPassportVerified && p.isFaceVerified) return "Passport & Face";
    if (p.isPassportVerified || p.isFaceVerified) return "Partial";
    return "Unverified";
  }
  if (p.isPhoneVerified && p.isDocumentVerified) return "Phone & ID";
  if (p.isPhoneVerified) return "Phone Verified";
  return "Unverified";
}

function drawHeader(doc, { schedule, ship, ports, totalBooked, boardedCount, capacity, vehicleCount }) {
  doc.rect(0, 0, doc.page.width, 96).fill(GRAPHITE);
  doc
    .fillColor(MINT)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("PORTGO", 40, 20, { characterSpacing: 1.5 });
  doc
    .fillColor("#FFFFFF")
    .fontSize(15)
    .font("Helvetica-Bold")
    .text("Official Coast Guard Passenger Manifest", 40, 35);
  doc
    .fillColor("#CBD5E1")
    .fontSize(8.5)
    .font("Helvetica")
    .text(`${ports.origin} to ${ports.destination} (${routeLabel(schedule.route)})`, 40, 56);

  const rightX = doc.page.width - 260;
  doc
    .fillColor("#FFFFFF")
    .fontSize(8.5)
    .font("Helvetica")
    .text(`Ship / Vessel: ${ship.name}`, rightX, 14, { width: 220, align: "right" })
    .text(`Voyage No.: ${schedule.voyageNumber || "N/A"}`, rightX, 26, { width: 220, align: "right" })
    .text(`Departure: ${schedule.departureTime}`, rightX, 38, { width: 220, align: "right" })
    .text(`Boarded / Booked / Capacity: ${boardedCount} / ${totalBooked} / ${capacity}`, rightX, 50, {
      width: 220,
      align: "right",
    })
    .text(`Vehicles / Cargo Aboard: ${vehicleCount}`, rightX, 62, { width: 220, align: "right" })
    .text(`Generated: ${new Date().toLocaleString()}`, rightX, 74, { width: 220, align: "right" });

  doc.y = 112;
}

function drawPriorityTotals(doc, startX, totals) {
  const entries = Object.entries(totals).filter(([, count]) => count > 0);
  if (entries.length === 0) return;

  doc.fillColor(GRAPHITE).font("Helvetica-Bold").fontSize(8.5).text("PRIORITY GROUP TOTALS", startX, doc.y);
  doc.y += 13;

  const chipGap = 8;
  let x = startX;
  const chipY = doc.y;
  doc.font("Helvetica-Bold").fontSize(8);
  for (const [label, count] of entries) {
    const text = `${label}: ${count}`;
    const chipWidth = doc.widthOfString(text) + 16;
    doc.roundedRect(x, chipY, chipWidth, 16, 8).fillAndStroke("#F1F5F9", LIGHT_BORDER);
    doc.fillColor(GRAPHITE).text(text, x + 8, chipY + 4);
    x += chipWidth + chipGap;
  }
  doc.y = chipY + 16 + 12;
}

function drawSectionTitle(doc, title) {
  doc.fillColor(GRAPHITE).font("Helvetica-Bold").fontSize(10).text(title, 40, doc.y);
  doc.y += 16;
}

function drawTableHeader(doc, startX, columns) {
  let x = startX;
  const y = doc.y;
  doc.rect(startX, y, columns.reduce((s, c) => s + c.width, 0), 20).fill("#F1F5F9");
  doc.fillColor(GRAPHITE).font("Helvetica-Bold").fontSize(8);
  for (const col of columns) {
    doc.text(col.label, x + 4, y + 6, { width: col.width - 6, ellipsis: true });
    x += col.width;
  }
  doc.y = y + 20;
}

function ensureSpace(doc, startX, rowHeight, columns) {
  if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 50) {
    doc.addPage();
    doc.y = 40;
    drawTableHeader(doc, startX, columns);
  }
}

function drawPassengerRow(doc, startX, trip, index) {
  const rowHeight = 18;
  ensureSpace(doc, startX, rowHeight, PASSENGER_COLUMNS);
  const y = doc.y;
  const p = trip.passenger;

  if (index % 2 === 0) {
    doc.rect(startX, y, PASSENGER_COLUMNS.reduce((s, c) => s + c.width, 0), rowHeight).fill("#FAFAFA");
  }

  doc.fillColor("#0F172A").font("Helvetica").fontSize(7.5);
  let x = startX;
  const emergencyContact = p.emergencyContactName
    ? `${p.emergencyContactName}${p.emergencyContactPhone ? ` (${p.emergencyContactPhone})` : ""}`
    : "—";
  const groupLabel = trip.familyBooking ? `FAM-${trip.familyBooking.masterCode.slice(-5)}` : "—";
  const cells = [
    String(index + 1),
    p.fullName,
    p.age != null ? String(p.age) : "—",
    p.gender,
    PASSENGER_TYPE_LABEL[p.passengerType] || p.passengerType,
    DIRECTION_LABEL[trip.transactionType] || trip.transactionType || "—",
    trip.accommodationClass ? CLASS_LABEL[trip.accommodationClass] || trip.accommodationClass : "—",
    verificationLabel(p),
    priorityFlags(p),
    groupLabel,
    emergencyContact,
    STATUS_LABEL[trip.status] || trip.status,
  ];
  cells.forEach((text, i) => {
    doc.text(String(text ?? ""), x + 4, y + 5, { width: PASSENGER_COLUMNS[i].width - 6, ellipsis: true });
    x += PASSENGER_COLUMNS[i].width;
  });

  doc
    .moveTo(startX, y + rowHeight)
    .lineTo(startX + PASSENGER_COLUMNS.reduce((s, c) => s + c.width, 0), y + rowHeight)
    .strokeColor(LIGHT_BORDER)
    .lineWidth(0.5)
    .stroke();

  doc.y = y + rowHeight;
}

function drawVehicleRow(doc, startX, trip, index) {
  const rowHeight = 18;
  ensureSpace(doc, startX, rowHeight, VEHICLE_COLUMNS);
  const y = doc.y;

  if (index % 2 === 0) {
    doc.rect(startX, y, VEHICLE_COLUMNS.reduce((s, c) => s + c.width, 0), rowHeight).fill("#FAFAFA");
  }

  doc.fillColor("#0F172A").font("Helvetica").fontSize(7.5);
  let x = startX;
  const cells = [
    String(index + 1),
    trip.plateNumber || "—",
    VEHICLE_TYPE_LABEL[trip.vehicleType] || trip.vehicleType || "—",
    trip.passenger.fullName,
    trip.passenger.passengerType,
    STATUS_LABEL[trip.status] || trip.status,
  ];
  cells.forEach((text, i) => {
    doc.text(String(text ?? ""), x + 4, y + 5, { width: VEHICLE_COLUMNS[i].width - 6, ellipsis: true });
    x += VEHICLE_COLUMNS[i].width;
  });

  doc
    .moveTo(startX, y + rowHeight)
    .lineTo(startX + VEHICLE_COLUMNS.reduce((s, c) => s + c.width, 0), y + rowHeight)
    .strokeColor(LIGHT_BORDER)
    .lineWidth(0.5)
    .stroke();

  doc.y = y + rowHeight;
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl || "");
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

function drawFooter(doc, { signOff } = {}) {
  const range = doc.bufferedPageRange();
  const lastPageIndex = range.start + range.count - 1;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const bottom = doc.page.height - 46;
    doc
      .moveTo(40, bottom)
      .lineTo(doc.page.width - 40, bottom)
      .strokeColor(LIGHT_BORDER)
      .stroke();
    doc
      .fontSize(7)
      .fillColor(SLATE)
      .font("Helvetica")
      .text(
        "Certified true and correct list of passengers and vehicles aboard. For Philippine Coast Guard (PCG) submission.",
        40,
        bottom + 6,
        { width: 420, lineBreak: false }
      )
      .text(`Page ${i + 1} of ${range.count}`, doc.page.width - 140, bottom + 6, {
        width: 100,
        align: "right",
        lineBreak: false,
      });

    if (i === lastPageIndex && signOff) {
      const sigBuffer = dataUrlToBuffer(signOff.signatureDataUrl);
      const sigX = doc.page.width - 260;
      if (sigBuffer) {
        try {
          doc.image(sigBuffer, sigX, bottom - 62, { width: 130, height: 36, fit: [130, 36] });
        } catch {
          // malformed signature image — fall back to text-only certification below
        }
      }
      doc
        .moveTo(sigX, bottom - 24)
        .lineTo(sigX + 220, bottom - 24)
        .strokeColor(GRAPHITE)
        .lineWidth(0.75)
        .stroke();
      doc
        .fontSize(7.5)
        .fillColor(GRAPHITE)
        .font("Helvetica-Bold")
        .text(`${signOff.officerName} — Badge #${signOff.badgeNumber}`, sigX, bottom - 12, {
          width: 220,
          align: "right",
        });
      doc
        .fontSize(6.5)
        .fillColor(SLATE)
        .font("Helvetica")
        .text(`PCG Inspector — Digitally Certified ${new Date(signOff.signedAt).toLocaleString()}`, sigX, bottom - 2, {
          width: 220,
          align: "right",
        });
    } else if (i === lastPageIndex) {
      doc
        .fontSize(7.5)
        .fillColor(GRAPHITE)
        .text("_______________________________", doc.page.width - 260, bottom - 24, { width: 220, align: "right" })
        .text("Master / Authorized Signatory", doc.page.width - 260, bottom - 12, { width: 220, align: "right" });
    }

    doc.page.margins.bottom = originalBottomMargin;
  }
}

function streamCoastGuardManifest(res, manifestData) {
  const { schedule, ship, ports, trips, vehicleTrips, totalBooked, boardedCount, capacity, signOff } = manifestData;
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40, bufferPages: true });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="pcg-manifest-${ship.code}-${schedule.departureTime.replace(/\s/g, "")}.pdf"`
  );
  doc.pipe(res);

  drawHeader(doc, { schedule, ship, ports, totalBooked, boardedCount, capacity, vehicleCount: vehicleTrips.length });

  const startX = 40;
  drawPriorityTotals(doc, startX, countPriorityTotals(trips));
  drawSectionTitle(doc, "PASSENGER LIST");
  if (trips.length === 0) {
    doc.fillColor(SLATE).font("Helvetica").fontSize(10).text("No passengers booked on this sailing.", startX, doc.y + 4);
    doc.y += 24;
  } else {
    drawTableHeader(doc, startX, PASSENGER_COLUMNS);
    trips.forEach((trip, idx) => drawPassengerRow(doc, startX, trip, idx));
    doc.y += 20;
  }

  if (vehicleTrips.length > 0) {
    ensureSpace(doc, startX, 40, VEHICLE_COLUMNS);
    drawSectionTitle(doc, "VEHICLE / CARGO MANIFEST");
    drawTableHeader(doc, startX, VEHICLE_COLUMNS);
    vehicleTrips.forEach((trip, idx) => drawVehicleRow(doc, startX, trip, idx));
  }

  drawFooter(doc, { signOff });
  doc.end();
}

module.exports = { streamCoastGuardManifest };
