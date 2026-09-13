import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  Keyboard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ScanLine,
  Users,
  ShieldCheck,
  ShieldAlert,
  UserRound,
  BadgeCheck,
  ArrowRightCircle,
  CloudOff,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PriorityTags } from "../../components/PriorityTags";
import { GateActivityLog } from "../../components/admin/GateActivityLog";
import { BoardingAnalyticsWidget } from "../../components/admin/BoardingAnalyticsWidget";
import { ConnectivityBadge } from "../../components/ConnectivityBadge";
import { cn } from "../../lib/cn";
import { apiClient } from "../../lib/apiClient";
import { playBeep } from "../../lib/beep";
import { priorityFlags } from "../../lib/priority";
import { tripStatusBadge } from "../../lib/tripStatus";
import { routeLabel } from "../../lib/route";
import { isNetworkAvailable, subscribeForcedOffline } from "../../lib/offlineSimulation";
import { enqueueScan, getScanQueue, removeFromScanQueue, scanQueueSize } from "../../lib/scanQueue";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../hooks/useAuth";

const MODES = [
  { value: "camera", label: "Camera", icon: Camera },
  { value: "manual", label: "Manual", icon: Keyboard },
];

function extractCode(decodedText) {
  try {
    const parsed = JSON.parse(decodedText);
    if (parsed?.masterCode) return parsed.masterCode;
    if (parsed?.passNumber) return parsed.passNumber;
  } catch {
    // not JSON, fall through
  }
  return decodedText.trim();
}

const KIND_STYLES = {
  success: { bg: "bg-emerald-600", border: "border-emerald-400", icon: CheckCircle2, label: "VALID PASSENGER" },
  warning: { bg: "bg-amber-500", border: "border-amber-300", icon: AlertTriangle, label: "ALREADY BOARDED" },
  error: { bg: "bg-rose-600", border: "border-rose-400", icon: XCircle, label: "INVALID / EXPIRED PASSENGER" },
  full: { bg: "bg-red-700", border: "border-red-400", icon: ShieldAlert, label: "CAPACITY FULL — BOARDING BLOCKED" },
  offline: { bg: "bg-slate-700", border: "border-slate-400", icon: CloudOff, label: "SAVED OFFLINE" },
};

function capacityMeterColor(pct) {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 90) return "bg-amber-400";
  return "bg-mint";
}

export default function GateScannerPage() {
  const [mode, setMode] = useState("camera");
  const [manualValue, setManualValue] = useState("");
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [flashKey, setFlashKey] = useState(0);
  const [queueCount, setQueueCount] = useState(() => scanQueueSize());
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const processingRef = useRef(false);
  const alertedTiersRef = useRef(new Map());
  const { showToast } = useToast();
  const { logout } = useAuth();

  function checkCapacityAlert(shipName, boardedCount, capacity) {
    if (!shipName || !capacity) return;
    const pct = Math.round((boardedCount / capacity) * 100);
    const tier = pct >= 100 ? 100 : pct >= 90 ? 90 : 0;
    const lastTier = alertedTiersRef.current.get(shipName) || 0;
    if (tier > 0 && tier > lastTier) {
      alertedTiersRef.current.set(shipName, tier);
      playBeep(tier === 100 ? "alarm" : "chime");
      showToast({
        title: tier === 100 ? "Vessel at full capacity" : "Vessel nearing capacity",
        description: `${shipName}: ${boardedCount}/${capacity} boarded (${pct}%).`,
        variant: tier === 100 ? "error" : "info",
      });
    } else if (tier < lastTier) {
      alertedTiersRef.current.set(shipName, tier);
    }
  }

  async function submitScan(code) {
    setIsProcessing(true);

    if (!isNetworkAvailable()) {
      const record = enqueueScan(code);
      setQueueCount(scanQueueSize());
      playBeep("warning");
      setResult({ kind: "offline", message: "No connection — recorded locally and will sync once reconnected.", code, localId: record.localId });
      setIsProcessing(false);
      return;
    }

    try {
      const res = await apiClient.post("/checkin/scan", { passNumber: code });
      playBeep("success");
      setFlashKey((k) => k + 1);
      if (res.data.isFamily) {
        setResult({
          kind: "success",
          message: `Family checked in — ${res.data.justBoardedCount} member(s) boarded`,
          isFamily: true,
          familyBooking: res.data.familyBooking,
          trips: res.data.trips,
          boardedCount: res.data.boardedCount,
          totalBooked: res.data.totalBooked,
          capacity: res.data.capacity,
          securityAlert: res.data.securityAlert,
        });
        checkCapacityAlert(res.data.trips?.[0]?.ship?.name, res.data.boardedCount, res.data.capacity);
      } else {
        setResult({
          kind: "success",
          message: "Boarded — welcome aboard!",
          trip: res.data.trip,
          boardedCount: res.data.boardedCount,
          totalBooked: res.data.totalBooked,
          capacity: res.data.capacity,
          securityAlert: res.data.securityAlert,
        });
        checkCapacityAlert(res.data.trip?.ship?.name, res.data.boardedCount, res.data.capacity);
      }
    } catch (err) {
      if (!err.response) {
        const record = enqueueScan(code);
        setQueueCount(scanQueueSize());
        playBeep("warning");
        setResult({ kind: "offline", message: "Network error — recorded locally and will sync once reconnected.", code, localId: record.localId });
        setIsProcessing(false);
        return;
      }
      const data = err.response.data;
      if (data?.capacityFull) {
        playBeep("alarm");
        setResult({
          kind: "full",
          message: data.message,
          trip: data.trip,
          isFamily: data.isFamily,
          familyBooking: data.family,
          boardedCount: data.boardedCount,
          capacity: data.capacity,
        });
      } else {
        // Invalid, duplicate, and cancelled scans all get the low-pitched reject buzzer.
        playBeep("error");
        if (err.response.status === 404) {
          setResult({ kind: "error", message: "Ticket not found", trip: null });
        } else if (data?.alreadyBoarded) {
          setResult({
            kind: "warning",
            message: data.isFamily ? "This family already checked in" : "Already checked in",
            trip: data.trip,
            isFamily: data.isFamily,
            familyBooking: data.family,
            trips: data.family?.trips,
            securityAlert: data.securityAlert,
          });
        } else {
          setResult({
            kind: "error",
            message: data?.message || "Check-in failed",
            trip: data?.trip || null,
            isFamily: data?.isFamily,
            familyBooking: data?.family,
            securityAlert: data?.securityAlert,
          });
        }
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
      let failed = 0;
      for (const record of queue) {
        if (!isNetworkAvailable()) break;
        try {
          await apiClient.post("/checkin/scan", { passNumber: record.code });
          synced += 1;
        } catch {
          failed += 1;
        } finally {
          removeFromScanQueue(record.localId);
          setQueueCount(scanQueueSize());
        }
      }
      isSyncing = false;
      if (synced > 0 || failed > 0) {
        showToast({
          title: "Offline scans synced",
          description: `${synced} boarded successfully${failed ? `, ${failed} could not be processed` : ""}.`,
          variant: failed > 0 && synced === 0 ? "error" : "success",
        });
      }
    }
    syncScanQueue();
    window.addEventListener("online", syncScanQueue);
    const unsubscribe = subscribeForcedOffline(syncScanQueue);
    return () => {
      window.removeEventListener("online", syncScanQueue);
      unsubscribe();
    };
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

  const style = result ? KIND_STYLES[result.kind] : null;
  const Icon = style?.icon;
  const flags = result?.trip ? priorityFlags(result.trip.passenger) : [];
  const ship = result?.trip?.ship || result?.trips?.[0]?.ship;
  const schedule = result?.trip?.schedule || result?.trips?.[0]?.schedule;

  return (
    <div className="fixed inset-0 z-40 flex min-h-[100dvh] w-full flex-col bg-[#0A0F0B] text-white">
      {result?.kind === "success" && (
        <div key={flashKey} className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 animate-[gateWelcomeFlash_1s_ease-out_forwards] bg-emerald-400" />
          <p className="relative scale-90 text-4xl font-black uppercase tracking-widest text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)] animate-[gateWelcomeText_1s_ease-out_forwards] sm:text-6xl">
            Welcome Aboard
          </p>
          <style>{`
            @keyframes gateWelcomeFlash {
              0% { opacity: 0.92; }
              70% { opacity: 0.55; }
              100% { opacity: 0; }
            }
            @keyframes gateWelcomeText {
              0% { opacity: 0; transform: scale(0.85); }
              25% { opacity: 1; transform: scale(1); }
              75% { opacity: 1; transform: scale(1); }
              100% { opacity: 0; transform: scale(1.05); }
            }
          `}</style>
        </div>
      )}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 shrink-0 text-mint" />
          <div>
            <p className="text-base font-bold leading-none sm:text-lg">Gate Control &amp; Boarding Scanner</p>
            <p className="mt-1 hidden text-xs text-white/50 sm:block">Port Security / Coast Guard boarding checkpoint</p>
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
          <Link
            to="/admin"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/70 hover:text-white"
            title="Exit scanner and return to the dashboard"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
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

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-auto p-4 sm:p-6 lg:grid-cols-2 lg:p-8 xl:grid-cols-[1fr_1fr_360px]">
        <div className="flex flex-col items-center justify-center">
          {mode === "camera" ? (
            <div className="w-full max-w-md">
              <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-3xl border-4 border-white/10 bg-black">
                <div id="gate-qr-reader" ref={containerRef} className="absolute inset-0 [&_video]:object-cover" />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-[12%] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    <span className="absolute -left-1 -top-1 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-mint" />
                    <span className="absolute -right-1 -top-1 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-mint" />
                    <span className="absolute -bottom-1 -left-1 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-mint" />
                    <span className="absolute -bottom-1 -right-1 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-mint" />
                    <div className="absolute inset-x-0 h-0.5 animate-[gateScan_2s_ease-in-out_infinite_alternate] bg-mint shadow-[0_0_10px_2px_rgba(183,255,114,0.85)]" />
                  </div>
                </div>
              </div>
              {cameraError && <p className="mt-3 text-center text-sm text-amber-400">{cameraError}</p>}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-white/40">
                <ScanLine className="h-4 w-4" />
                Point the camera at a boarding pass or family master QR
              </p>
              <style>{`
                @keyframes gateScan {
                  0% { top: 0%; }
                  100% { top: 100%; }
                }
              `}</style>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Pass / Master Code</label>
                <Input
                  autoFocus
                  placeholder="PG-20260814-XXXXX or FAM-..."
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value.toUpperCase())}
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isProcessing || !manualValue.trim()}>
                {isProcessing ? "Checking..." : "Check In"}
              </Button>
            </form>
          )}
        </div>

        <div className="flex flex-col justify-center">
          {!result && (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border-2 border-dashed border-white/10 text-white/30">
              Scan results will appear here
            </div>
          )}

          {result && (
            <div className={cn("rounded-3xl border-4 p-5 text-center sm:p-8", style.bg, style.border)}>
              <Icon className="mx-auto h-14 w-14 sm:h-16 sm:w-16" />
              <p className="mt-3 text-2xl font-black leading-tight tracking-wide sm:text-3xl">{style.label}</p>
              <p className="mt-1 text-base font-medium text-white/90">{result.message}</p>

              {result.securityAlert?.matched && (
                <div className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs font-semibold text-amber-300">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Security Clearance Required — {result.securityAlert.passengerName}
                </div>
              )}

              {result.isFamily && result.familyBooking && (
                <div className="mt-5 rounded-2xl bg-black/20 p-4 text-left">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <Users className="h-4 w-4" />
                    {result.familyBooking.headFullName} &amp; Family ({result.familyBooking.memberCount})
                  </p>
                  <p className="mt-1 font-mono text-xs text-white/60">{result.familyBooking.masterCode}</p>
                  <div className="mt-2 space-y-1 text-sm text-white/80">
                    {(result.trips || []).map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{t.passenger.fullName}</span>
                        <Badge variant={tripStatusBadge(t.status).variant} className="shrink-0">
                          {tripStatusBadge(t.status).label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!result.isFamily && result.trip && (
                <div className="mt-5 flex flex-col items-center gap-4 rounded-2xl bg-black/20 p-4 text-center sm:flex-row sm:text-left">
                  {result.trip.passenger.selfiePhotoUrl ? (
                    <img
                      src={result.trip.passenger.selfiePhotoUrl}
                      alt={result.trip.passenger.fullName}
                      className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white/25 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/25 bg-black/30">
                      <UserRound className="h-8 w-8 text-white/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold leading-tight">{result.trip.passenger.fullName}</p>
                    <p className="mt-0.5 font-mono text-sm text-white/70">{result.trip.passNumber}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant={tripStatusBadge(result.trip.status).variant}>
                        {tripStatusBadge(result.trip.status).label}
                      </Badge>
                      {flags.length > 0 && <PriorityTags flags={flags} />}
                    </div>
                  </div>
                </div>
              )}

              {result.kind === "offline" && (
                <div className="mt-5 rounded-2xl bg-black/20 p-4 text-left">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <CloudOff className="h-4 w-4" />
                    Code recorded for later verification
                  </p>
                  <p className="mt-1 font-mono text-sm text-white/80">{result.code}</p>
                  <p className="mt-2 text-xs text-white/60">
                    Boarding status will be confirmed automatically once this scanner reconnects to the network.
                  </p>
                </div>
              )}

              {ship && schedule && (
                <p className="mt-4 text-sm text-white/80">
                  {ship.name} &middot; {routeLabel(schedule.route)} &middot; {schedule.departureTime}
                </p>
              )}

              {result.boardedCount != null && result.capacity != null && (
                <div className="mt-4 rounded-2xl bg-black/25 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-white/60">Vessel Capacity</p>
                    <p className="text-xs font-bold text-white/80">
                      {Math.min(100, Math.round((result.boardedCount / result.capacity) * 100))}%
                    </p>
                  </div>
                  <p className="mt-1 text-xl font-black">
                    {ship?.name || "Vessel"}: {result.boardedCount}/{result.capacity} Boarded
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        capacityMeterColor(Math.round((result.boardedCount / result.capacity) * 100))
                      )}
                      style={{ width: `${Math.min(100, Math.round((result.boardedCount / result.capacity) * 100))}%` }}
                    />
                  </div>
                  {result.totalBooked != null && (
                    <p className="mt-1.5 text-xs text-white/60">{result.totalBooked} total booked this sailing</p>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                {result.kind === "success" && (
                  <Button
                    size="lg"
                    className="flex-1 rounded-xl bg-white text-emerald-700 hover:bg-white/90 focus-visible:ring-white sm:flex-none sm:px-8"
                    onClick={handleScanNext}
                  >
                    <BadgeCheck className="h-5 w-5" />
                    Approve Boarding
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10 focus-visible:ring-white sm:flex-none sm:px-8"
                  onClick={handleScanNext}
                >
                  <ArrowRightCircle className="h-5 w-5" />
                  Scan Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="hidden xl:flex xl:min-h-0 xl:flex-col xl:gap-6">
          <div className="shrink-0 overflow-y-auto">
            <BoardingAnalyticsWidget />
          </div>
          <div className="min-h-0 flex-1">
            <GateActivityLog />
          </div>
        </div>
      </div>
    </div>
  );
}
