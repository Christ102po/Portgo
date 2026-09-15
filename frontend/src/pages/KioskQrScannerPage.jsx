import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Armchair,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Keyboard,
  QrCode,
  RotateCcw,
  Search,
  ShipWheel,
  Snowflake,
  Star,
  UsersRound,
} from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { cn } from "../lib/cn";
import { routeLabel } from "../lib/route";
import { accommodationClassLabel } from "../lib/accommodationClass";

const CLASS_ICONS = {
  ECONOMY: Armchair,
  TOURIST_AIRCON: Snowflake,
  BUSINESS: Star,
};

function extractCode(raw) {
  const value = String(raw || "").trim();
  try {
    const parsed = JSON.parse(value);
    return parsed.masterCode || parsed.passNumber || value;
  } catch {
    return value;
  }
}

function routeForTransactionType(transactionType) {
  return transactionType === "SIGN_IN" ? "SURIGAO_TO_DAPA" : transactionType === "SIGN_OUT" ? "DAPA_TO_SURIGAO" : null;
}

function parseTimeToMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3]?.toUpperCase();
  if (suffix === "PM" && hour !== 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function manilaMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function circularMinuteDistance(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

function formatScannerTime(date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export default function KioskQrScannerPage() {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const [mode, setMode] = useState("camera");
  const [manualValue, setManualValue] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [profile, setProfile] = useState(null);
  const [scannedCode, setScannedCode] = useState("");
  const [error, setError] = useState("");
  const [ships, setShips] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [transactionType, setTransactionType] = useState("");
  const [shipId, setShipId] = useState("");
  const [accommodationClass, setAccommodationClass] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedTrip, setSavedTrip] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [clockNow, setClockNow] = useState(() => new Date());

  async function syncServerTime(serverIso = null) {
    try {
      let iso = serverIso;
      if (!iso) {
        const res = await apiClient.get("/passengers/kiosk-time");
        iso = res.data.serverTime;
      }
      if (iso) setServerOffsetMs(new Date(iso).getTime() - Date.now());
    } catch {
      // Keep the last known server offset; trip timestamps are still generated
      // by the backend when the passenger confirms the movement.
    }
  }

  useEffect(() => {
    Promise.all([apiClient.get("/ships"), apiClient.get("/schedules")])
      .then(([shipsRes, schedulesRes]) => {
        setShips(shipsRes.data.ships || []);
        setSchedules(schedulesRes.data.schedules || []);
      })
      .catch(() => setError("Unable to load current ship and schedule information."));

    syncServerTime();
    const clockTimer = window.setInterval(() => setClockNow(new Date(Date.now() + serverOffsetMs)), 1000);
    const syncTimer = window.setInterval(() => syncServerTime(), 30000);
    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(syncTimer);
    };
    // serverOffsetMs is intentionally included so the displayed clock adopts a
    // newly synchronized server offset immediately.
  }, [serverOffsetMs]);

  async function lookup(raw) {
    const code = extractCode(raw);
    if (!code || processingRef.current) return;
    processingRef.current = true;
    setIsSearching(true);
    setError("");
    try {
      const res = await apiClient.get("/passengers/qr-profile", { params: { query: code } });
      setProfile(res.data.registration);
      setScannedCode(code);
      setTransactionType("");
      setShipId("");
      setAccommodationClass("");
      setSavedTrip(null);
      syncServerTime(res.data.serverTime);
    } catch (err) {
      setProfile(null);
      setError(err.response?.data?.message || "Unable to open this registration. Please try again.");
    } finally {
      setIsSearching(false);
      window.setTimeout(() => {
        processingRef.current = false;
      }, 1200);
    }
  }

  useEffect(() => {
    if (mode !== "camera" || profile || savedTrip) return undefined;
    let cancelled = false;
    let started = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled || !containerRef.current) return;
      const scanner = new Html5Qrcode(containerRef.current.id);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => lookup(decodedText),
          () => {}
        )
        .then(() => {
          started = true;
        })
        .catch(() => setCameraError("Camera access is unavailable. You can enter the pass code manually instead."));
    });

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner && started) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, profile, savedTrip]);

  const selectedShip = useMemo(() => ships.find((ship) => ship.id === shipId) || null, [ships, shipId]);
  const selectedRoute = routeForTransactionType(transactionType);
  const currentAdjustedTime = useMemo(() => new Date(Date.now() + serverOffsetMs), [clockNow, serverOffsetMs]);

  const matchingSchedule = useMemo(() => {
    if (!shipId || !selectedRoute) return null;
    const candidates = schedules.filter((schedule) => schedule.shipId === shipId && schedule.route === selectedRoute);
    if (!candidates.length) return null;
    const nowMinutes = manilaMinutes(currentAdjustedTime);
    return [...candidates].sort((a, b) => {
      const aTime = parseTimeToMinutes(a.departureTime);
      const bTime = parseTimeToMinutes(b.departureTime);
      const aDistance = aTime == null ? Number.MAX_SAFE_INTEGER : circularMinuteDistance(aTime, nowMinutes);
      const bDistance = bTime == null ? Number.MAX_SAFE_INTEGER : circularMinuteDistance(bTime, nowMinutes);
      return aDistance - bDistance;
    })[0];
  }, [shipId, selectedRoute, schedules, currentAdjustedTime]);

  const offeredClasses = useMemo(() => {
    if (!selectedShip) return [];
    if (!selectedShip.classes?.length) {
      const economyAvailability = matchingSchedule?.classAvailability?.find((item) => item.className === "ECONOMY");
      return [{ className: "ECONOMY", economyOnly: true, ...economyAvailability }];
    }
    return selectedShip.classes.map((configured) => ({
      ...configured,
      ...(matchingSchedule?.classAvailability?.find((item) => item.className === configured.className) || {}),
    }));
  }, [selectedShip, matchingSchedule]);

  useEffect(() => {
    if (!selectedShip) {
      setAccommodationClass("");
      return;
    }
    if (!selectedShip.classes?.length) {
      setAccommodationClass("ECONOMY");
      return;
    }
    if (!selectedShip.classes.some((item) => item.className === accommodationClass)) {
      setAccommodationClass("");
    }
  }, [selectedShip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseDirection(value) {
    setTransactionType(value);
  }

  function chooseShip(value) {
    setShipId(value);
    const ship = ships.find((item) => item.id === value);
    setAccommodationClass(ship && !ship.classes?.length ? "ECONOMY" : "");
  }

  function reset() {
    setProfile(null);
    setSavedTrip(null);
    setError("");
    setManualValue("");
    setScannedCode("");
    setTransactionType("");
    setShipId("");
    setAccommodationClass("");
    processingRef.current = false;
  }

  async function confirmTrip() {
    if (!scannedCode || !transactionType || !shipId || !accommodationClass || !matchingSchedule) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await apiClient.post("/passengers/kiosk-trip", {
        code: scannedCode,
        transactionType,
        shipId,
        accommodationClass,
      });
      setSavedTrip(res.data);
      syncServerTime(res.data.scannedAt);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to record this trip. Please ask port staff for assistance.");
    } finally {
      setIsSaving(false);
    }
  }

  const partySize = profile?.passengerCount || 1;
  const selectedAvailability = offeredClasses.find((item) => item.className === accommodationClass);
  const enoughClassSeats = selectedAvailability?.seatsLeft == null || selectedAvailability.seatsLeft >= partySize;
  const enoughShipSeats = matchingSchedule?.seatsLeft == null || matchingSchedule.seatsLeft >= partySize;
  const canConfirm = Boolean(
    profile && transactionType && selectedShip && matchingSchedule && accommodationClass && enoughClassSeats && enoughShipSeats && !isSaving
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#063c2e] via-[#0b5b43] to-[#eef8f3]">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#063c2e]/95 px-4 py-4 text-white backdrop-blur sm:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" /> Kiosk Home
        </Link>
        <div className="text-right">
          <p className="font-black">PORTGO QR Scanner</p>
          <p className="hidden text-[10px] uppercase tracking-[0.16em] text-emerald-200/70 sm:block">Passenger Trip Recording</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300 text-[#063c2e]">
            <QrCode className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black sm:text-4xl">Scan your PORTGO QR</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-emerald-50/70">
            Scan your registered QR, then confirm your current inbound or outbound trip, vessel, and accommodation.
          </p>
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-emerald-50 shadow-sm backdrop-blur">
            <Clock3 className="h-4 w-4 text-emerald-200" />
            <span>{formatScannerTime(currentAdjustedTime)} PHT</span>
          </div>
        </div>

        <div className="mx-auto max-w-5xl rounded-[28px] border border-white/30 bg-white p-4 shadow-2xl shadow-emerald-950/20 sm:p-6 lg:p-8">
          {!profile && !savedTrip ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
                <button type="button" onClick={() => { setMode("camera"); setCameraError(""); }} className={cn("flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-black transition", mode === "camera" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500")}>
                  <Camera className="h-4 w-4" /> Camera
                </button>
                <button type="button" onClick={() => setMode("manual")} className={cn("flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-black transition", mode === "manual" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500")}>
                  <Keyboard className="h-4 w-4" /> Manual Code
                </button>
              </div>

              {mode === "camera" ? (
                <div className="mx-auto max-w-xl">
                  <div className="relative mx-auto aspect-square max-h-[58dvh] w-full max-w-[520px] overflow-hidden rounded-[26px] bg-slate-950">
                    <div id="kiosk-pass-qr-reader" ref={containerRef} className="absolute inset-0 [&_video]:object-cover" />
                    <div className="pointer-events-none absolute inset-[11%] rounded-3xl border-4 border-emerald-300/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>
                  {cameraError && <p className="mt-3 text-center text-sm font-semibold text-amber-700">{cameraError}</p>}
                  {isSearching && <p className="mt-3 text-center text-sm font-bold text-emerald-700">Reading registration…</p>}
                </div>
              ) : (
                <form onSubmit={(event) => { event.preventDefault(); lookup(manualValue); }} className="mx-auto max-w-lg py-8">
                  <label className="mb-2 block text-sm font-bold text-slate-700">Pass / Master Code</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input autoFocus placeholder="PG-... or FAM-..." value={manualValue} onChange={(event) => setManualValue(event.target.value.toUpperCase())} />
                    <Button type="submit" variant="kiosk" disabled={!manualValue.trim() || isSearching}>
                      <Search className="h-4 w-4" /> {isSearching ? "Opening…" : "Open"}
                    </Button>
                  </div>
                </form>
              )}
              {error && <p className="mt-4 text-center text-sm font-semibold text-red-600">{error}</p>}
            </>
          ) : savedTrip ? (
            <div className="py-4 text-center sm:py-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-11 w-11 text-emerald-600" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">Trip Recorded</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                {savedTrip.partySize > 1
                  ? `The trip was recorded for all ${savedTrip.partySize} registered travelers under this QR.`
                  : "Your current port trip has been recorded successfully."}
              </p>

              <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Direction</p>
                  <p className="mt-1 font-black text-slate-900">{savedTrip.transactionType === "SIGN_IN" ? "Outbound / Departing" : "Inbound / Arriving"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Vessel</p>
                  <p className="mt-1 font-black text-slate-900">{savedTrip.ship.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Accommodation</p>
                  <p className="mt-1 font-black text-slate-900">{accommodationClassLabel(savedTrip.accommodationClass)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Scanner Time</p>
                  <p className="mt-1 font-black text-emerald-950">{formatScannerTime(new Date(savedTrip.scannedAt))} PHT</p>
                </div>
              </div>

              <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-emerald-100 bg-white p-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Matched Active Sailing</p>
                <p className="mt-1 font-bold text-slate-900">{routeLabel(savedTrip.schedule.route)} · {savedTrip.schedule.departureTime}</p>
                <p className="mt-1 text-xs text-slate-500">PORTGO matched this scan to the closest active schedule for the selected vessel and direction.</p>
              </div>

              <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
                <Button variant="outline" size="lg" onClick={reset}><RotateCcw className="h-4 w-4" /> Scan Another QR</Button>
                <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-black text-white hover:bg-emerald-800">Finish / Kiosk Home</Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-900">Registration Found</h2>
                <p className="mt-1 text-sm text-slate-500">Confirm the trip you are taking right now.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[.8fr_1.2fr]">
                <aside className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-emerald-700" />
                    <p className="font-black text-emerald-950">{profile.isFamily ? `${profile.passengerCount} Registered Travelers` : "Registered Passenger"}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {profile.passengers.map((passenger) => (
                      <div key={passenger.id} className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
                        <p className="truncate text-sm font-bold text-slate-900">{passenger.fullName}</p>
                        <p className="text-[11px] text-slate-400">{passenger.role === "LEADER" ? "Primary passenger / QR holder" : "Accompanying member"}</p>
                      </div>
                    ))}
                  </div>
                  {profile.isFamily && (
                    <p className="mt-3 text-xs leading-5 text-emerald-800">The same trip details will be recorded for every member linked to this group QR.</p>
                  )}
                </aside>

                <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div>
                    <p className="text-sm font-black text-slate-900">1. Is this trip inbound or outbound?</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        { value: "SIGN_IN", title: "Outbound", subtitle: "Departing from Surigao", icon: ArrowUpRight },
                        { value: "SIGN_OUT", title: "Inbound", subtitle: "Arriving in Surigao", icon: ArrowDownLeft },
                      ].map((option) => {
                        const Icon = option.icon;
                        const selected = transactionType === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => chooseDirection(option.value)}
                            className={cn(
                              "relative min-h-28 rounded-2xl border-2 p-4 text-left transition",
                              selected ? "border-emerald-500 bg-emerald-600 text-white shadow-lg" : "border-slate-200 bg-slate-50 text-slate-900 hover:border-emerald-300"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <Icon className={cn("h-6 w-6", selected ? "text-white" : "text-emerald-700")} />
                              {selected && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-emerald-700"><Check className="h-4 w-4" /></span>}
                            </div>
                            <p className="mt-3 text-lg font-black">{option.title}</p>
                            <p className={cn("text-xs", selected ? "text-emerald-50" : "text-slate-500")}>{option.subtitle}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-900">2. What ship did you board?</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ships.map((ship) => {
                        const selected = shipId === ship.id;
                        return (
                          <button
                            key={ship.id}
                            type="button"
                            onClick={() => chooseShip(ship.id)}
                            className={cn(
                              "flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition",
                              selected ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"
                            )}
                          >
                            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-emerald-700")}>
                              <ShipWheel className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black text-slate-900">{ship.name}</span>
                              <span className="text-[11px] text-slate-500">{ship.hasAccommodationTypes ? "Multiple accommodation types" : "Economy only"}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedShip && (
                    <div>
                      <p className="text-sm font-black text-slate-900">3. Accommodation</p>
                      {!selectedShip.hasAccommodationTypes ? (
                        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700"><Armchair className="h-5 w-5" /></span>
                          <div>
                            <p className="text-sm font-black text-slate-900">Economy Class</p>
                            <p className="text-xs text-slate-500">This ship is Economy-only, so PORTGO selected it automatically.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {offeredClasses.map((item) => {
                            const Icon = CLASS_ICONS[item.className] || Armchair;
                            const selected = accommodationClass === item.className;
                            const unavailable = item.seatsLeft != null && item.seatsLeft < partySize;
                            return (
                              <button
                                key={item.className}
                                type="button"
                                disabled={unavailable}
                                onClick={() => setAccommodationClass(item.className)}
                                className={cn(
                                  "rounded-2xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                                  selected ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-200 bg-white hover:border-emerald-300"
                                )}
                              >
                                <Icon className="h-5 w-5" />
                                <p className="mt-2 text-sm font-black">{accommodationClassLabel(item.className)}</p>
                                {item.seatsLeft != null && <p className={cn("mt-1 text-[11px]", selected ? "text-emerald-50" : "text-slate-500")}>{item.seatsLeft} seat(s) left</p>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={cn("rounded-2xl border p-4", matchingSchedule ? "border-emerald-100 bg-emerald-50/70" : "border-amber-200 bg-amber-50")}>
                    <div className="flex items-start gap-3">
                      <Clock3 className={cn("mt-0.5 h-5 w-5 shrink-0", matchingSchedule ? "text-emerald-700" : "text-amber-600")} />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current Scanner Time</p>
                        <p className="mt-0.5 font-black text-slate-900">{formatScannerTime(currentAdjustedTime)} PHT</p>
                        {matchingSchedule ? (
                          <>
                            <p className="mt-2 text-sm font-bold text-emerald-900">Matched sailing: {matchingSchedule.departureTime} · {routeLabel(matchingSchedule.route)}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">PORTGO automatically uses the closest active schedule for the selected ship and direction.</p>
                          </>
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-amber-700">Select a direction and ship with an available active schedule.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button variant="outline" size="lg" onClick={reset}><RotateCcw className="h-4 w-4" /> Scan Again</Button>
                    <Button variant="kiosk" size="lg" disabled={!canConfirm} onClick={confirmTrip}>
                      {isSaving ? "Recording Trip…" : "Confirm & Record Trip"}
                    </Button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
