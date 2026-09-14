import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import "./styles/index.css";

// Capture the browser's native PWA install prompt so the top-bar app button can
// install PORTGO directly when Chrome/Android supports it. If this prompt is
// unavailable, the same button falls back to the configured APK download.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__portgoInstallPrompt = event;
    window.dispatchEvent(new Event("portgo-install-available"));
  });

  window.addEventListener("appinstalled", () => {
    window.__portgoInstallPrompt = null;
    window.dispatchEvent(new Event("portgo-install-available"));
  });
}


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);


if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("PORTGO service worker registration failed:", error);
    });
  });
}
