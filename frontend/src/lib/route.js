// Home terminal context. The kiosk is physically installed at one port, so all
// "outbound / inbound" wording is relative to this location. Override per
// deployment with VITE_PORT_NAME / VITE_PORT_DESTINATIONS (see frontend/.env).
export const PORT_NAME = import.meta.env.VITE_PORT_NAME || "Surigao";
export const PORT_DESTINATIONS = import.meta.env.VITE_PORT_DESTINATIONS || "Dapa / Siargao";

export function routeLabel(route) {
  return route === "SURIGAO_TO_DAPA" ? "Surigao → Dapa" : "Dapa → Surigao";
}
