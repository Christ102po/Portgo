import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function GateActivityLog() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    function load() {
      apiClient
        .get("/checkin/activity", { params: { limit: 12 } })
        .then((res) => setRows(res.data.rows))
        .catch(() => {});
    }
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Activity className="h-4 w-4 text-mint" />
        <p className="text-sm font-semibold text-white">Live Gate Activity Log</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {rows.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-white/40">No scans yet this session.</p>
        )}
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg bg-black/20 px-3 py-2 text-xs">
              <p className="text-white/90">{row.details}</p>
              <p className="mt-0.5 text-white/40">
                {row.adminName || row.adminEmail || "Gate Officer"} &middot; {formatTime(row.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
