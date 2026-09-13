import { useEffect, useState } from "react";
import { Activity, Download, HeartHandshake, Accessibility, UserRound } from "lucide-react";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { PeakHoursChart } from "./charts/PeakHoursChart";
import { apiClient, downloadWithAuth } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";

function BoardingGauge({ pct }) {
  const color = pct >= 80 ? "#B7FF72" : pct >= 40 ? "#FBBF24" : "#F87171";
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,0.1) 0deg)` }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A0F0B]">
          <span className="text-sm font-black text-white">{pct}%</span>
        </div>
      </div>
      <div className="text-xs text-white/60">
        <p className="font-semibold text-white/90">Boarded vs. Pending</p>
        <p>Today&apos;s active sailings, system-wide</p>
      </div>
    </div>
  );
}

export function BoardingAnalyticsWidget() {
  const [analytics, setAnalytics] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    function load() {
      apiClient
        .get("/checkin/analytics")
        .then((res) => setAnalytics(res.data))
        .catch(() => {});
    }
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    apiClient
      .get("/schedules")
      .then((res) => setSchedules(res.data.schedules))
      .catch(() => {});
  }, []);

  async function handleExportManifest() {
    if (!scheduleId) {
      showToast({ title: "Select a sailing first", description: "Choose a schedule to certify.", variant: "info" });
      return;
    }
    setIsExporting(true);
    try {
      await downloadWithAuth(
        `/checkin/audit-manifest/export?scheduleId=${scheduleId}`,
        `boarding-audit-manifest-${scheduleId}.csv`
      );
    } catch {
      showToast({ title: "Export failed", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  }

  const scheduleOptions = schedules.map((s) => ({
    value: s.id,
    label: `${s.ship.name} — ${s.departureTime}`,
  }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Activity className="h-4 w-4 text-mint" />
        <p className="text-sm font-semibold text-white">Boarding Analytics</p>
      </div>

      <div className="space-y-4 p-4">
        {!analytics ? (
          <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        ) : (
          <>
            <BoardingGauge pct={analytics.boardedPct} />

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-black/20 px-2 py-2">
                <p className="text-lg font-bold text-mint">{analytics.boardedCount}</p>
                <p className="text-white/50">Boarded</p>
              </div>
              <div className="rounded-lg bg-black/20 px-2 py-2">
                <p className="text-lg font-bold text-amber-300">{analytics.pendingCount}</p>
                <p className="text-white/50">Pending</p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                Priority Passengers Boarded
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="flex flex-col items-center gap-1 rounded-lg bg-black/20 px-2 py-2 text-amber-200">
                  <UserRound className="h-3.5 w-3.5" />
                  {analytics.priorityCounts.senior} Senior
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-black/20 px-2 py-2 text-blue-200">
                  <Accessibility className="h-3.5 w-3.5" />
                  {analytics.priorityCounts.pwd} PWD
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-black/20 px-2 py-2 text-pink-200">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  {analytics.priorityCounts.pregnant} Pregnant
                </div>
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                Hourly Scan Rate (Today)
              </p>
              <div className="rounded-lg bg-black/20 p-1">
                <PeakHoursChart data={analytics.hourlyScanRate} dark emptyLabel="No scans yet today." />
              </div>
            </div>
          </>
        )}

        <div className="border-t border-white/10 pt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Boarding Audit Manifest
          </p>
          <Select
            dark
            value={scheduleId}
            onValueChange={setScheduleId}
            options={scheduleOptions}
            placeholder="Select a sailing to certify"
            className="mb-2"
          />
          <Button variant="outline" size="sm" className="w-full" onClick={handleExportManifest} disabled={isExporting}>
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Preparing..." : "Download Audit Manifest"}
          </Button>
        </div>
      </div>
    </div>
  );
}
