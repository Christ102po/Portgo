import { routeLabel } from "./route";
import { passengerTypeLabel } from "./verification";
import { accommodationClassLabel } from "./accommodationClass";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function downloadBoardingPass({ passenger, trip, ship, schedule, qrCodeDataUrl, passNumber }) {
  const width = 640;
  const headerHeight = 220;
  const qrSize = 260;
  const qrPad = 18;
  const qrY = headerHeight + 40;
  const footerY = qrY + qrSize + qrPad * 2 + 70;
  const height = footerY + 70;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FDFBF7";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#18251D";
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.textBaseline = "top";
  ctx.fillStyle = "#B7FF72";
  ctx.font = "bold 12px Arial";
  ctx.fillText("PORTGO PASSENGER CONFIRMATION", 32, 28);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 24px Arial";
  ctx.fillText(passenger?.fullName || "", 32, 50);

  const fields = [
    ["Ship / Vessel", ship?.name],
    ["Route", schedule ? routeLabel(schedule.route) : ""],
    ["Departure", schedule?.departureTime],
    ["Passenger Type", passengerTypeLabel(passenger?.passengerType)],
  ];
  if (trip?.accommodationClass) fields.push(["Class", accommodationClassLabel(trip.accommodationClass)]);

  const colW = (width - 64) / 2;
  fields.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 32 + col * colW;
    const y = 96 + row * 54;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "bold 10px Arial";
    ctx.fillText(String(label).toUpperCase(), x, y);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 15px Arial";
    ctx.fillText(String(value || "—"), x, y + 16);
  });

  const qrX = (width - qrSize) / 2;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);
  ctx.strokeStyle = "#18251D";
  ctx.lineWidth = 3;
  ctx.strokeRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);

  if (qrCodeDataUrl) {
    const img = await loadImage(qrCodeDataUrl);
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 11px Arial";
  ctx.fillText("REFERENCE ID", width / 2, qrY + qrSize + qrPad + 22);

  ctx.fillStyle = "#18251D";
  ctx.font = "bold 22px monospace";
  ctx.fillText(passNumber || "", width / 2, qrY + qrSize + qrPad + 42);
  ctx.textAlign = "left";

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, footerY);
  ctx.lineTo(width - 32, footerY);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.font = "12px Arial";
  ctx.fillText(`${ship?.name || ""}   ·   ${schedule?.departureTime || ""}`, 32, footerY + 16);
  ctx.fillText(schedule ? routeLabel(schedule.route) : "", 32, footerY + 36);

  const link = document.createElement("a");
  link.download = `PORTGO-Pass-${passNumber || "boarding"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
