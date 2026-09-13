import { useEffect, useMemo, useState } from "react";
import { Users, ArrowUpRight, ArrowDownLeft, ShieldAlert, Ship as ShipIcon, Printer, Download } from "lucide-react";
import { StatCard } from "../../components/admin/StatCard";
import { ManifestFilters, EMPTY_MANIFEST_FILTERS } from "../../components/admin/ManifestFilters";
import { ManifestInspectionTable } from "../../components/admin/ManifestInspectionTable";
import { Pagination } from "../../components/admin/Pagination";
import { Button } from "../../components/ui/Button";
import { apiClient, downloadWithAuth } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";

const PAGE_SIZE = 15;

function computeVesselCapacitySummary({ filters, ships, schedules }) {
  if (filters.scheduleId) {
    const schedule = schedules.find((s) => s.id === filters.scheduleId);
    if (!schedule) return { value: "—", sublabel: "Schedule not found" };
    return {
      value: `${schedule.seatsLeft} / ${schedule.capacity ?? "—"}`,
      sublabel: schedule.isFull ? "Seats left — FULL" : "Seats left on this sailing",
    };
  }
  if (filters.shipId) {
    const ship = ships.find((s) => s.id === filters.shipId);
    const sailingsToday = schedules.filter((s) => s.shipId === filters.shipId).length;
    return {
      value: ship ? ship.capacity : "—",
      sublabel: `Rated capacity · ${sailingsToday} sailing${sailingsToday === 1 ? "" : "s"} scheduled`,
    };
  }
  const totalCapacity = ships.reduce((sum, s) => sum + (s.capacity || 0), 0);
  return {
    value: totalCapacity || "—",
    sublabel: `Across ${ships.length} vessel${ships.length === 1 ? "" : "s"} fleet-wide`,
  };
}

export default function ManifestDashboardPage() {
  const [ships, setShips] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [filters, setFilters] = useState(EMPTY_MANIFEST_FILTERS);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    apiClient.get("/ships?all=1").then((res) => setShips(res.data.ships));
    apiClient.get("/schedules").then((res) => setSchedules(res.data.schedules));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setIsLoading(true);
    const params = { ...filters, page, pageSize: PAGE_SIZE };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    const timeout = setTimeout(() => {
      apiClient
        .get("/records", { params })
        .then((res) => {
          setRows(res.data.rows);
          setTotal(res.data.total);
          setSummary(res.data.summary);
        })
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters, page]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const query = new URLSearchParams(params).toString();
      await downloadWithAuth(
        `/records/export${query ? `?${query}` : ""}`,
        `portgo-manifest-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch {
      showToast({ title: "Export failed", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  }

  const capacitySummary = useMemo(
    () => computeVesselCapacitySummary({ filters, ships, schedules }),
    [filters, ships, schedules]
  );
  const activeFilterSummary = useMemo(() => {
    const parts = [];
    if (filters.shipId) parts.push(ships.find((s) => s.id === filters.shipId)?.name);
    if (filters.transactionType) parts.push(filters.transactionType === "SIGN_IN" ? "Outbound" : "Inbound");
    if (filters.accommodationClass) parts.push(filters.accommodationClass.replace("_", " "));
    if (filters.date) parts.push(filters.date);
    return parts.filter(Boolean).join(" · ") || "All Vessels — All Schedules";
  }, [filters, ships]);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-graphite">Passenger Manifest Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live inspection log for port officers and Philippine Coast Guard clearance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV / Excel"}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print Official Manifest (Coast Guard Copy)
          </Button>
        </div>
      </header>

      {/* Print-only official header — screen users never see this block. */}
      <div className="mb-4 hidden print:block">
        <p className="text-xs font-bold tracking-widest text-black">PORTGO — SURIGAO / DAPA PORT AUTHORITY</p>
        <h1 className="text-lg font-bold text-black">Official Passenger Manifest (Coast Guard Copy)</h1>
        <p className="mt-0.5 text-xs text-black">
          Scope: {activeFilterSummary} &middot; Generated {new Date().toLocaleString()}
        </p>
      </div>

      {summary && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
          <StatCard label="Total Passengers Logged" value={summary.total} icon={Users} accent />
          <StatCard label="Total Departed" value={summary.departed} icon={ArrowUpRight} accentColor="blue" sublabel="Outbound / Sign In" />
          <StatCard label="Total Arrived" value={summary.arrived} icon={ArrowDownLeft} accentColor="teal" sublabel="Inbound / Sign Out" />
          <StatCard label="Priority Passengers" value={summary.priority} icon={ShieldAlert} accentColor="amber" sublabel="Senior / PWD" />
          <StatCard
            label="Vessel Capacity"
            value={capacitySummary.value}
            icon={ShipIcon}
            accentColor="violet"
            sublabel={capacitySummary.sublabel}
          />
        </div>
      )}

      <ManifestFilters filters={filters} onChange={setFilters} ships={ships} schedules={schedules} />
      <ManifestInspectionTable rows={rows} total={total} isLoading={isLoading} />
      <div className="print:hidden">
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
