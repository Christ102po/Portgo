import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { useToast } from "./ui/Toast";
import { cn } from "../lib/cn";

/**
 * Downloads the currently configured PORTGO Android APK.
 *
 * The backend serves frontend/public/downloads/PortGo.apk when present, or
 * redirects to APK_DOWNLOAD_URL when that Railway variable is configured.
 * Android itself always asks the user to confirm installation of downloaded
 * APK files; browsers cannot silently install applications.
 */
export function ApkDownloadButton({ dark = false, compact = false }) {
  const [checking, setChecking] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(() =>
    typeof window !== "undefined" ? window.__portgoInstallPrompt || null : null
  );
  const { showToast } = useToast();

  useEffect(() => {
    const refresh = () => setInstallPrompt(window.__portgoInstallPrompt || null);
    window.addEventListener("portgo-install-available", refresh);
    return () => window.removeEventListener("portgo-install-available", refresh);
  }, []);

  async function handleDownload() {
    if (checking) return;
    setChecking(true);

    try {
      // Prefer the browser's secure native install flow when available. Chrome
      // on Android can install PORTGO to the home screen as a PWA/WebAPK.
      if (installPrompt) {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        window.__portgoInstallPrompt = null;
        setInstallPrompt(null);

        if (choice?.outcome === "accepted") {
          showToast({
            title: "PORTGO installation started",
            description: "Android will finish adding PORTGO to your phone.",
          });
        }
        return;
      }

      const { data } = await apiClient.get("/app/apk/status", {
        headers: { "Cache-Control": "no-cache" },
      });

      if (!data?.available) {
        showToast({
          title: "APK not uploaded yet",
          description:
            "The download button is ready, but PortGo.apk still needs to be uploaded or APK_DOWNLOAD_URL must be set in Railway.",
          variant: "error",
        });
        return;
      }

      const base = String(apiClient.defaults.baseURL || "/api").replace(/\/+$/, "");
      // Navigating to the backend endpoint lets the browser download a local APK
      // or follow the configured release URL without exposing it in the UI.
      window.location.assign(`${base}/app/apk`);
    } catch (error) {
      showToast({
        title: "APK download unavailable",
        description:
          error?.response?.data?.message ||
          "Could not reach the APK download service. Please try again after the latest deployment finishes.",
        variant: "error",
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={checking}
      title={installPrompt ? "Install PORTGO app" : "Download PORTGO Android APK"}
      aria-label={installPrompt ? "Install PORTGO app" : "Download PORTGO Android APK"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:cursor-wait disabled:opacity-60",
        compact ? "h-8 w-8 p-0" : "px-2.5 py-1 text-[11px]",
        dark
          ? "bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
          : "border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {checking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {!compact && <span className="hidden sm:inline">{installPrompt ? "Install App" : "Get APK"}</span>}
    </button>
  );
}
