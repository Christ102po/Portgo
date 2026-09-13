import axios from "axios";

const TOKEN_KEY = "portgo_admin_token";

// Resolve the backend base URL dynamically so the app works whether it's opened
// on this PC (localhost) or from a phone/tablet on the same WiFi (the PC's LAN
// IP). Only an explicit VITE_API_BASE_URL override wins over the dynamic value.
function resolveApiBaseUrl() {
  const override = import.meta.env.VITE_API_BASE_URL;
  if (override) {
    const normalized = override.replace(/\/+$/, "");
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  }

  if (typeof window === "undefined") return "/api";

  const { hostname, protocol } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  // Keep the old two-server workflow for local/LAN development. In production,
  // the Express server serves the built frontend and API from the same HTTPS
  // origin, so a relative URL works on any Railway/custom domain.
  return isLocalHost ? `${protocol}//${hostname}:4000/api` : "/api";
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function downloadWithAuth(path, filename) {
  const token = getToken();
  const res = await fetch(`${apiClient.defaults.baseURL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
