const QRCode = require("qrcode");

function randomToken(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generatePassNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `PG-${y}${m}${d}-${randomToken(5)}`;
}

async function generateQrDataUrl(payload) {
  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
}

module.exports = { generatePassNumber, generateQrDataUrl };
