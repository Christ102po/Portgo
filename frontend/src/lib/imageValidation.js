// Client-side heuristic image-quality checks run on Canvas pixel data.
// This is NOT real biometric face detection — no ML model is wired in.
// It rejects the obvious non-photo cases (solid colors, blank scans,
// flat icons/logos, degenerate aspect ratios) that a genuine camera
// photo of a face or a printed ticket would never produce.

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to decode image"));
    img.src = dataUrl;
  });
}

function analyzeImage(img, sampleSize = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d");
  // Nearest-neighbor sampling (not smoothed) so the stats reflect the
  // source image's real texture instead of an averaged-out blur — a
  // smoothed downscale would wash out genuine photo grain/noise and
  // risk false-rejecting real (if slightly grainy) camera photos.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  const colorSet = new Set();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += luma;
    sumSq += luma * luma;
    count += 1;
    // quantize to 16 levels per channel to ignore camera-noise jitter
    // while still separating genuinely distinct colors/tones
    colorSet.add(`${r >> 4}-${g >> 4}-${b >> 4}`);
  }

  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);

  return {
    stdDev: Math.sqrt(variance),
    uniqueColors: colorSet.size,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

const GENERIC_ERROR = "Unable to read this image. Please try a different photo.";

export async function validatePassportPhoto(dataUrl) {
  let stats;
  try {
    const img = await loadImageFromDataUrl(dataUrl);
    stats = analyzeImage(img);
  } catch {
    return { valid: false, message: GENERIC_ERROR };
  }

  const aspect = stats.width / stats.height;
  const looksBlankOrSolid = stats.stdDev < 10;
  const looksLikeIconOrGraphic = stats.uniqueColors < 30;
  const extremeAspect = aspect < 0.35 || aspect > 3.5;

  if (looksBlankOrSolid || looksLikeIconOrGraphic || extremeAspect) {
    return {
      valid: false,
      message: "Invalid ID/Passport Photo: Face detection failed or photo is unclear.",
    };
  }
  return { valid: true };
}
