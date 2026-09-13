import { useEffect, useState } from "react";
import { Anchor, AlertTriangle, Clock } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { cn } from "../lib/cn";

const REFRESH_MS = 15000;

const STATUS_STYLE = {
  BOARDING: { label: "BOARDING", cls: "bg-mint text-graphite", pulse: true },
  ON_TIME: { label: "ON TIME", cls: "bg-sky-500/20 text-sky-300 border border-sky-500/40" },
  DELAYED: { label: "DELAYED", cls: "bg-amber-500/20 text-amber-300 border border-amber-500/40" },
  CANCELLED: { label: "CANCELLED", cls: "bg-red-500/20 text-red-300 border border-red-500/40" },
  DEPARTED: { label: "DEPARTED", cls: "bg-white/5 text-white/30 border border-white/10" },
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function StatusBadge({ row }) {
  const status = STATUS_STYLE[row.status] || STATUS_STYLE.ON_TIME;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1.5 text-xs font-bold tracking-wide sm:px-4 sm:text-sm",
        status.cls,
        status.pulse && "animate-pulse"
      )}
    >
      {status.label}
      {row.status === "DELAYED" && row.delayMinutes ? ` +${row.delayMinutes}m` : ""}
    </span>
  );
}

export default function DisplayBoardPage() {
  const [board, setBoard] = useState([]);
  const [advisory, setAdvisory] = useState(null);
  const now = useClock();

  useEffect(() => {
    function load() {
      apiClient.get("/display/board").then((res) => {
        setBoard(res.data.board);
        setAdvisory(res.data.advisory);
      });
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-[100dvh] w-full bg-[#0A0F0B] text-white">
      <header className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 lg:px-10 lg:py-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint text-graphite sm:h-11 sm:w-11">
            <Anchor className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight sm:text-xl">PORTGO</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-white/40 sm:text-xs">Live Departure Board</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-mono text-2xl font-bold tabular-nums sm:text-3xl lg:text-4xl">{timeStr}</p>
          <p className="mt-0.5 text-xs text-white/50 sm:text-sm">{dateStr}</p>
        </div>
      </header>

      {advisory?.active && (
        <div className="flex items-center gap-3 overflow-hidden bg-red-600 px-4 py-3 sm:px-6 lg:px-10">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
          <div className="min-w-0 overflow-hidden whitespace-nowrap">
            <div className="animate-[ticker_22s_linear_infinite] text-xs font-bold uppercase tracking-wide sm:text-sm">
              &#9888; Gale Warning Advisory — {advisory.message || "All sea travel is currently affected. Please coordinate with port staff."} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &#9888; Gale Warning Advisory — {advisory.message || "All sea travel is currently affected. Please coordinate with port staff."}
            </div>
          </div>
        </div>
      )}

      <main className="w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        {board.length === 0 ? (
          <div className="flex min-h-[55dvh] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] px-6 text-center text-sm text-white/35 sm:text-base">
            No active sailings scheduled.
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1.1fr] gap-4 border-b border-white/10 bg-white/5 px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-white/40 lg:px-6 lg:text-xs">
                <span>Vessel</span>
                <span>Destination</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Departure</span>
                <span>Voyage No.</span>
                <span>Gate / Dock</span>
                <span className="text-right">Status</span>
              </div>

              {board.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1.1fr] items-center gap-4 border-b border-white/5 px-5 py-5 text-sm last:border-0 lg:px-6 lg:text-lg",
                    row.status === "DEPARTED" && "opacity-40"
                  )}
                >
                  <span className="min-w-0 truncate font-semibold">{row.shipName}</span>
                  <span className="min-w-0 truncate text-white/70">{row.ports?.destination}</span>
                  <span className="font-mono font-bold tabular-nums">{row.departureTime}</span>
                  <span className="min-w-0 truncate font-mono text-white/50">{row.voyageNumber || "—"}</span>
                  <span className="min-w-0 truncate font-mono text-white/50">{row.gateNumber || "—"}</span>
                  <div className="flex justify-end"><StatusBadge row={row} /></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 md:hidden">
              {board.map((row) => (
                <article
                  key={row.id}
                  className={cn(
                    "rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_12px_34px_-24px_rgba(0,0,0,0.8)]",
                    row.status === "DEPARTED" && "opacity-45"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">{row.shipName}</p>
                      <p className="mt-0.5 truncate text-sm text-white/55">To {row.ports?.destination || "—"}</p>
                    </div>
                    <StatusBadge row={row} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-black/20 p-3 text-xs">
                    <div>
                      <p className="uppercase tracking-wide text-white/35">Departure</p>
                      <p className="mt-1 flex items-center gap-1.5 font-mono text-base font-bold"><Clock className="h-3.5 w-3.5" />{row.departureTime}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide text-white/35">Gate / Dock</p>
                      <p className="mt-1 font-mono text-sm text-white/80">{row.gateNumber || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="uppercase tracking-wide text-white/35">Voyage No.</p>
                      <p className="mt-1 break-all font-mono text-sm text-white/70">{row.voyageNumber || "—"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
