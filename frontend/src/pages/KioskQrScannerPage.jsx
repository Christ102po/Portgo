import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, Keyboard, QrCode, RotateCcw, Search, UsersRound } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { routeLabel } from "../lib/route";
import { passengerStatusBadge } from "../lib/tripStatus";
import { cn } from "../lib/cn";

function extractCode(raw) {
  const value = String(raw || "").trim();
  try {
    const parsed = JSON.parse(value);
    return parsed.masterCode || parsed.passNumber || value;
  } catch {
    return value;
  }
}

export default function KioskQrScannerPage() {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const [mode, setMode] = useState("camera");
  const [manualValue, setManualValue] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  async function lookup(raw) {
    const code = extractCode(raw);
    if (!code || processingRef.current) return;
    processingRef.current = true;
    setIsSearching(true);
    setError("");
    try {
      const res = await apiClient.get("/passengers/lookup", { params: { query: code } });
      if (!res.data.trips?.length) {
        setResults([]);
        setError("No PORTGO registration was found for this QR code.");
      } else {
        setResults(res.data.trips);
      }
    } catch (err) {
      setResults([]);
      setError(err.response?.data?.message || "Unable to open this registration. Please try again.");
    } finally {
      setIsSearching(false);
      window.setTimeout(() => {
        processingRef.current = false;
      }, 1200);
    }
  }

  useEffect(() => {
    if (mode !== "camera" || results) return undefined;
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
  }, [mode, results]);

  function reset() {
    setResults(null);
    setError("");
    setManualValue("");
    processingRef.current = false;
  }

  const first = results?.[0] || null;
  const isGroup = !!first?.trip?.familyBookingId && results?.length > 1;
  const badge = first ? passengerStatusBadge(first.trip.status) : null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#063c2e] via-[#0b5b43] to-[#eef8f3]">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#063c2e]/95 px-4 py-4 text-white backdrop-blur sm:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" /> Kiosk Home
        </Link>
        <div className="text-right">
          <p className="font-black">PORTGO QR Scanner</p>
          <p className="hidden text-[10px] uppercase tracking-[0.16em] text-emerald-200/70 sm:block">Existing Registration</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300 text-[#063c2e]">
            <QrCode className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black sm:text-4xl">Scan your PORTGO QR</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-emerald-50/70">Show your existing QR code to the kiosk camera to open the saved passenger and trip information.</p>
        </div>

        <div className="mx-auto max-w-4xl rounded-[28px] border border-white/30 bg-white p-4 shadow-2xl shadow-emerald-950/20 sm:p-6">
          {!results ? (
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
                <form onSubmit={(e) => { e.preventDefault(); lookup(manualValue); }} className="mx-auto max-w-lg py-8">
                  <label className="mb-2 block text-sm font-bold text-slate-700">Pass / Master Code</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input autoFocus placeholder="PG-... or FAM-..." value={manualValue} onChange={(e) => setManualValue(e.target.value.toUpperCase())} />
                    <Button type="submit" variant="kiosk" disabled={!manualValue.trim() || isSearching}>
                      <Search className="h-4 w-4" /> {isSearching ? "Opening…" : "Open"}
                    </Button>
                  </div>
                </form>
              )}
              {error && <p className="mt-4 text-center text-sm font-semibold text-red-600">{error}</p>}
            </>
          ) : results.length > 0 ? (
            <div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-900">Registration Found</h2>
                <p className="mt-1 text-sm text-slate-500">Your PORTGO registration is active in the system.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_.9fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Primary Passenger</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{first.passenger.fullName}</p>
                    </div>
                    {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                  </div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-5"><dt className="text-slate-500">Reference</dt><dd className="font-mono font-bold text-slate-900">{first.passNumber}</dd></div>
                    <div className="flex justify-between gap-5"><dt className="text-slate-500">Vessel</dt><dd className="font-semibold text-slate-900">{first.ship.name}</dd></div>
                    <div className="flex justify-between gap-5"><dt className="text-slate-500">Route</dt><dd className="font-semibold text-right text-slate-900">{routeLabel(first.schedule.route)}</dd></div>
                    <div className="flex justify-between gap-5"><dt className="text-slate-500">Departure</dt><dd className="font-semibold text-slate-900">{first.schedule.departureTime}</dd></div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-emerald-700" />
                    <p className="font-black text-emerald-950">{isGroup ? `${results.length} Registered Travelers` : "Passenger Registration"}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {results.map((r, index) => (
                      <div key={r.trip.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{r.passenger.fullName}</p>
                          <p className="text-[11px] text-slate-400">{index === 0 ? "Primary passenger / QR holder" : "Accompanying member"}</p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">Recorded</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <Button variant="outline" size="lg" onClick={reset}><RotateCcw className="h-4 w-4" /> Scan Another QR</Button>
                <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-black text-white hover:bg-emerald-800">Finish / Kiosk Home</Link>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <QrCode className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-3 text-xl font-black text-slate-900">Registration Not Found</h2>
              <p className="mt-2 text-sm text-slate-500">{error || "The scanned QR code is not linked to an active PORTGO registration."}</p>
              <Button className="mt-5" variant="kiosk" onClick={reset}><RotateCcw className="h-4 w-4" /> Try Again</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
