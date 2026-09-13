const KEY = "portgo_force_offline";
const EVENT = "portgo-force-offline-change";

export function isForcedOffline() {
  return localStorage.getItem(KEY) === "1";
}

export function setForcedOffline(value) {
  if (value) localStorage.setItem(KEY, "1");
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function isNetworkAvailable() {
  return navigator.onLine && !isForcedOffline();
}

export function subscribeForcedOffline(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
