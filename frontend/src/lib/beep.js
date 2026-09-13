let sharedCtx = null;

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AudioCtx();
  if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

function tone(ctx, { freq, start, duration, type = "square", gainValue = 0.18 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playBeep(variant = "success") {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (variant === "success") {
      // Crisp double-chirp — the classic "accepted" scanner sound.
      tone(ctx, { freq: 1568, start: 0, duration: 0.09 });
      tone(ctx, { freq: 1976, start: 0.11, duration: 0.12 });
    } else if (variant === "warning") {
      tone(ctx, { freq: 660, start: 0, duration: 0.16, type: "sine" });
    } else if (variant === "alarm") {
      // Urgent triple-pulse siren for capacity threshold alerts.
      tone(ctx, { freq: 880, start: 0, duration: 0.12, type: "square", gainValue: 0.2 });
      tone(ctx, { freq: 880, start: 0.16, duration: 0.12, type: "square", gainValue: 0.2 });
      tone(ctx, { freq: 880, start: 0.32, duration: 0.2, type: "square", gainValue: 0.2 });
    } else if (variant === "chime") {
      // Subtle two-note bell chime — gentle heads-up for the 90% capacity threshold.
      tone(ctx, { freq: 1046, start: 0, duration: 0.22, type: "sine", gainValue: 0.1 });
      tone(ctx, { freq: 1318, start: 0.1, duration: 0.28, type: "sine", gainValue: 0.1 });
    } else {
      // Low buzzy double-beep for rejected/invalid scans.
      tone(ctx, { freq: 220, start: 0, duration: 0.14, type: "sawtooth", gainValue: 0.14 });
      tone(ctx, { freq: 196, start: 0.17, duration: 0.18, type: "sawtooth", gainValue: 0.14 });
    }
  } catch {
    // audio not available, ignore
  }
}
