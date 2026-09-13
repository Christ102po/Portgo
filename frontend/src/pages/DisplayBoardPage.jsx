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
    <div className="min-h-screen bg-[#0A0F0B] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-10 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-graphite">
            <Anchor className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">PORTGO</p>
            <p className="text-xs uppercase tracking-widest text-white/40">Live Departure Board</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-4xl font-bold tabular-nums">{timeStr}</p>
          <p className="text-sm text-white/50">{dateStr}</p>
        </div>
      </header>

      {advisory?.active && (
        <div className="flex items-center gap-3 overflow-hidden bg-red-600 px-10 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
          <div className="overflow-hidden whitespace-nowrap">
            <div className="animate-[ticker_22s_linear_infinite] text-sm font-bold uppercase tracking-wide">
              &#9888; Gale Warning Advisory — {advisory.message || "All sea travel is currently affected. Please coordinate with port staff."} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &#9888; Gale Warning Advisory — {advisory.message || "All sea travel is currently affected. Please coordinate with port staff."}
            </div>
          </div>
        </div>
      )}

      <main className="px-10 py-8">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1.1fr] gap-4 border-b border-white/10 bg-white/5 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/40">
            <span>Vessel</span>
            <span>Destination</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Departure
            </span>
            <span>Voyage No.</span>
            <span>Gate / Dock</span>
            <span className="text-right">Status</span>
          </div>

          {board.length === 0 && (
            <div className="px-6 py-16 text-center text-white/30">No active sailings scheduled.</div>
          )}

          {board.map((row) => {
            const status = STATUS_STYLE[row.status] || STATUS_STYLE.ON_TIME;
            return (
              <div
                key={row.id}
                className={cn(
                  "grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1.1fr] items-center gap-4 border-b border-white/5 px-6 py-5 text-lg last:border-0",
                  row.status === "DEPARTED" && "opacity-40"
                )}
              >
                <span className="font-semibold">{row.shipName}</span>
                <span className="text-white/70">{row.ports?.destination}</span>
                <span className="font-mono font-bold tabular-nums">{row.departureTime}</span>
                <span className="font-mono text-white/50">{row.voyageNumber || "—"}</span>
                <span className="font-mono text-white/50">{row.gateNumber || "—"}</span>
                <div className="flex justify-end">
                  <span
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-bold tracking-wide",
                      status.cls,
                      status.pulse && "animate-pulse"
                    )}
                  >
                    {status.label}
                    {row.status === "DELAYED" && row.delayMinutes ? ` +${row.delayMinutes}m` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
