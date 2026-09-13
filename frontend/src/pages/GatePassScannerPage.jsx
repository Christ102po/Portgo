import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Keyboard,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ScanLine,
  UserRound,
  ArrowRightCircle,
  CloudOff,
  LogOut,
} from "lucide-react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { ConnectivityBadge } from "../components/ConnectivityBadge";
import { cn } from "../lib/cn";
import { apiClient } from "../lib/apiClient";
import { playBeep } from "../lib/beep";
import { routeLabel } from "../lib/route";
import { accommodationClassLabel } from "../lib/accommodationClass";
import { isNetworkAvailable } from "../lib/offlineSimulation";
import { enqueueScan, getScanQueue, removeFromScanQueue, scanQueueSize } from "../lib/scanQueue";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../hooks/useAuth";

// Dedicated, single-purpose gate terminal: scan -> the server verifies the
// pass against the manifest and (on success) flips the trip's status to
// BOARDED in the same request — this view just reflects that result back
// as a bold, unmissable overlay. It reuses the same /checkin/scan endpoint
// as the full admin Gate Control page (see GateScannerPage.jsx) rather than
// re-implementing boarding/capacity/security-watchlist logic separately.
const MODES = [
  { value: "camera", label: "Camera", icon: Camera },
  { value: "manual", label: "Manual", icon: Keyboard },
];

function extractCode(decodedText) {
  try {
    const parsed = JSON.parse(decodedText);
    if (parsed?.passNumber) return parsed.passNumber;
  } catch {
    // not JSON, fall through
  }
  return decodedText.trim();
}

const STATE_STYLES = {
  allowed: { bg: "bg-emerald-600", ring: "ring-emerald-300", icon: CheckCircle2, label: "ALLOWED TO BOARD" },
  alreadyBoarded: { bg: "bg-rose-600", ring: "ring-rose-300", icon: XCircle, label: "ALREADY BOARDED" },
  invalid: { bg: "bg-rose-600", ring: "ring-rose-300", icon: XCircle, label: "INVALID TICKET" },
  capacityFull: { bg: "bg-amber-500", ring: "ring-amber-300", icon: ShieldAlert, label: "CAPACITY FULL" },
  offline: { bg: "bg-slate-700", ring: "ring-slate-400", icon: CloudOff, label: "SAVED OFFLINE" },
};

export default function GatePassScannerPage() {
  const [mode, setMode] = useState("camera");
  const [manualValue, setManualValue] = useState("");
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [queueCount, setQueueCount] = useState(() => scanQueueSize());
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const processingRef = useRef(false);
  const { showToast } = useToast();
  const { logout } = useAuth();

  async function submitScan(code) {
    setIsProcessing(true);

    if (!isNetworkAvailable()) {
      const record = enqueueScan(code);
      setQueueCount(scanQueueSize());
      playBeep("warning");
      setResult({ state: "offline", code, localId: record.localId });
      setIsProcessing(false);
      return;
    }

    try {
      const res = await apiClient.post("/checkin/scan", { passNumber: code });
      playBeep("success");
      setResult({ state: "allowed", trip: res.data.trip, isFamily: res.data.isFamily, familyBooking: res.data.familyBooking });
    } catch (err) {
      if (!err.response) {
        const record = enqueueScan(code);
        setQueueCount(scanQueueSize());
        playBeep("warning");
        setResult({ state: "offline", code, localId: record.localId });
        setIsProcessing(false);
        return;
      }
      const data = err.response.data;
      if (data?.capacityFull) {
        playBeep("alarm");
        setResult({ state: "capacityFull", message: data.message, trip: data.trip });
      } else if (data?.alreadyBoarded) {
        playBeep("error");
        setResult({ state: "alreadyBoarded", trip: data.trip, isFamily: data.isFamily, familyBooking: data.family });
      } else {
        playBeep("error");
        setResult({ state: "invalid", message: data?.message || "Ticket not found" });
      }
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    let isSyncing = false;
    async function syncScanQueue() {
      if (isSyncing || !isNetworkAvailable()) return;
      const queue = getScanQueue();
      if (queue.length === 0) return;
      isSyncing = true;
      let synced = 0;
      for (const record of queue) {
        if (!isNetworkAvailable()) break;
        try {
          await apiClient.post("/checkin/scan", { passNumber: record.code });
          synced += 1;
        } catch {
          // leave it queued if the retry also fails
        } finally {
          removeFromScanQueue(record.localId);
          setQueueCount(scanQueueSize());
        }
      }
      isSyncing = false;
      if (synced > 0) {
        showToast({ title: "Offline scans synced", description: `${synced} pass(es) processed.`, variant: "success" });
      }
    }
    syncScanQueue();
    window.addEventListener("online", syncScanQueue);
    return () => window.removeEventListener("online", syncScanQueue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCameraDecode(code) {
    if (processingRef.current) return;
    processingRef.current = true;
    submitScan(code).finally(() => {
      setTimeout(() => {
        processingRef.current = false;
      }, 1800);
    });
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualValue.trim() || isProcessing) return;
    submitScan(manualValue.trim());
    setManualValue("");
  }

  function handleScanNext() {
    setResult(null);
    processingRef.current = false;
  }

  useEffect(() => {
    if (mode !== "camera") return;
    let cancelled = false;
    let isRunning = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled || !containerRef.current) return;
      const scanner = new Html5Qrcode(containerRef.current.id);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => handleCameraDecode(extractCode(decodedText)),
          () => {}
        )
        .then(() => {
          if (cancelled) {
            scanner.stop().then(() => scanner.clear()).catch(() => {});
          } else {
            isRunning = true;
          }
        })
        .catch(() => {
          setCameraError("Camera unavailable — use Manual Entry instead.");
        });
    });

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner && isRunning) {
        try {
          scanner.stop().then(() => scanner.clear()).catch(() => {});
        } catch {
          // scanner was already stopped/never started, nothing to clean up
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const style = result ? STATE_STYLES[result.state] : null;
  const Icon = style?.icon;
  const trip = result?.trip;

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#0A0F0B] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <ScanLine className="h-6 w-6 shrink-0 text-mint" />
          <div>
            <p className="text-base font-bold leading-none sm:text-lg">Gate Pass Scanner</p>
            <p className="mt-1 hidden text-xs text-white/50 sm:block">Boarding checkpoint — scan to verify &amp; board</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ConnectivityBadge />
          {queueCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-400/30">
              <CloudOff className="h-3 w-3" />
              {queueCount} pending sync
            </span>
          )}
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {MODES.map((m) => {
              const MIcon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => {
                    setMode(m.value);
                    setCameraError("");
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all sm:px-4 sm:py-2",
                    mode === m.value ? "bg-mint text-graphite" : "text-white/60 hover:text-white"
                  )}
                >
                  <MIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-auto p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
        <div className="flex flex-col items-center justify-center">
          {mode === "camera" ? (
            <div className="w-full max-w-md">
              <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-3xl border-4 border-white/10 bg-black">
                <div id="gate-pass-qr-reader" ref={containerRef} className="absolute inset-0 [&_video]:object-cover" />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-[12%] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    <span className="absolute -left-1 -top-1 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-mint" />
                    <span className="absolute -right-1 -top-1 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-mint" />
                    <span className="absolute -bottom-1 -left-1 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-mint" />
                    <span className="absolute -bottom-1 -right-1 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-mint" />
                  </div>
                </div>
              </div>
              {cameraError && <p className="mt-3 text-center text-sm text-amber-400">{cameraError}</p>}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-white/40">
                <ScanLine className="h-4 w-4" />
                Point the camera at the passenger&apos;s digital pass or printed stub
              </p>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Pass / Gate Pass Code</label>
                <Input
                  autoFocus
                  placeholder="PG-20260814-XXXXX"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value.toUpperCase())}
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isProcessing || !manualValue.trim()}>
                {isProcessing ? "Verifying..." : "Verify Pass"}
              </Button>
            </form>
          )}
        </div>

        <div className="flex flex-col justify-center">
          {!result && (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-3xl border-2 border-dashed border-white/10 text-white/30">
              Awaiting scan...
            </div>
          )}

          {result && (
            <div className={cn("rounded-3xl p-6 text-center shadow-2xl ring-8 sm:p-10", style.bg, style.ring)}>
              <Icon className="mx-auto h-16 w-16 sm:h-20 sm:w-20" />
              <p className="mt-4 text-3xl font-black leading-tight tracking-wide sm:text-5xl">{style.label}</p>
              {result.message && <p className="mt-2 text-base font-medium text-white/90">{result.message}</p>}

              {trip && (
                <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl bg-black/25 p-4 text-center sm:flex-row sm:text-left">
                  {trip.passenger.selfiePhotoUrl ? (
                    <img
                      src={trip.passenger.selfiePhotoUrl}
                      alt={trip.passenger.fullName}
                      className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white/25 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-white/25 bg-black/30">
                      <UserRound className="h-10 w-10 text-white/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-bold leading-tight">{trip.passenger.fullName}</p>
                    <p className="mt-0.5 font-mono text-sm text-white/70">{trip.passNumber}</p>
                    <p className="mt-1.5 text-sm text-white/90">
                      {trip.ship?.name}
                      {trip.schedule && ` · ${routeLabel(trip.schedule.route)} · ${trip.schedule.departureTime}`}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-white/90">
                      {trip.accommodationClass ? accommodationClassLabel(trip.accommodationClass) : "No class assigned"}
                    </p>
                  </div>
                </div>
              )}

              {result.state === "offline" && (
                <div className="mt-6 rounded-2xl bg-black/25 p-4 text-left">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <CloudOff className="h-4 w-4" />
                    No connection — recorded locally
                  </p>
                  <p className="mt-1 font-mono text-sm text-white/80">{result.code}</p>
                  <p className="mt-2 text-xs text-white/60">
                    This pass will be verified automatically once this terminal reconnects to the network.
                  </p>
                </div>
              )}

              <Button
                size="lg"
                className="mt-8 w-full rounded-xl bg-white px-6 text-graphite sm:w-auto sm:px-8 hover:bg-white/90 focus-visible:ring-white"
                onClick={handleScanNext}
              >
                <ArrowRightCircle className="h-5 w-5" />
                Scan Next Pass
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
