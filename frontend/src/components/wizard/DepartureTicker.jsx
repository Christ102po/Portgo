import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { routeLabel } from "../../lib/route";

const REFRESH_MS = 20000;

const BOARDING_LABEL = {
  BOARDING: "Boarding Open",
  ON_TIME: "On Time",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
};

function buildTickerText(board) {
  const upcoming = board.filter((row) => row.status !== "DEPARTED" && row.status !== "CANCELLED");
  if (upcoming.length === 0) return "No upcoming departures scheduled at this time.";

  return upcoming
    .map((row) => {
      const gate = row.gateNumber ? `Gate ${row.gateNumber}` : "Gate TBA";
      const label = BOARDING_LABEL[row.status] || "On Time";
      return `NEXT DEPARTURE: ${row.shipName} — ${routeLabel(row.route)} — ${row.departureTime} — ${gate} — ${label.toUpperCase()}`;
    })
    .join("     •     ");
}

export function DepartureTicker() {
  const [board, setBoard] = useState([]);

  useEffect(() => {
    function load() {
      apiClient
        .get("/display/board")
        .then((res) => setBoard(res.data.board || []))
        .catch(() => {});
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const text = buildTickerText(board);

  return (
    <div className="flex items-center gap-3 overflow-hidden border-b border-emerald-400/20 bg-slate-900 px-4 py-2 text-white sm:px-8 print:hidden">
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-400/30">
        <Radio className="h-3 w-3 animate-pulse" />
        Live
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="whitespace-nowrap">
          <span className="inline-block animate-[departureTicker_28s_linear_infinite] text-xs font-semibold tracking-wide text-white/90 sm:text-sm">
            {text}
            <span className="mx-6" />
            {text}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes departureTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
