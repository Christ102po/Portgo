const KEY = "portgo_audio_guidance";
const EVENT = "portgo-audio-guidance-change";

export function isAudioGuidanceEnabled() {
  return localStorage.getItem(KEY) === "1";
}

export function setAudioGuidanceEnabled(value) {
  if (value) localStorage.setItem(KEY, "1");
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeAudioGuidance(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
