import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Users, MapPin, Plane } from "lucide-react";
import { RecordsFilters, EMPTY_RECORDS_FILTERS } from "../../components/admin/RecordsFilters";
import { RecordsTable } from "../../components/admin/RecordsTable";
import { Pagination } from "../../components/admin/Pagination";
import { CancelBookingModal } from "../../components/admin/CancelBookingModal";
import { RebookModal } from "../../components/admin/RebookModal";
import { ManifestModal } from "../../components/admin/ManifestModal";
import { StatCard } from "../../components/admin/StatCard";
import { SeaConditionControl } from "../../components/admin/SeaConditionControl";
import { VesselCapacityStats } from "../../components/admin/VesselCapacityStats";
import { apiClient, downloadWithAuth } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";

const PAGE_SIZE = 10;

export default function RecordsPage() {
  const location = useLocation();
  const [ships, setShips] = useState([]);
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_RECORDS_FILTERS,
    search: location.state?.presetSearch || "",
  }));
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rebookTarget, setRebookTarget] = useState(null);
  const [manifestScheduleId, setManifestScheduleId] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    apiClient.get("/ships?all=1").then((res) => setShips(res.data.ships));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  function reload() {
    setIsLoading(true);
    const params = { ...filters, page, pageSize: PAGE_SIZE };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    return apiClient
      .get("/records", { params })
      .then((res) => {
        setRows(res.data.rows);
        setTotal(res.data.total);
        setSummary(res.data.summary);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(reload, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const query = new URLSearchParams(params).toString();
      await downloadWithAuth(
        `/records/export${query ? `?${query}` : ""}`,
        `portgo-records-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err) {
      showToast({ title: "Export failed", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleBoard(trip) {
    try {
      await apiClient.patch(`/records/${trip.id}/status`, { status: "BOARDED" });
      showToast({ title: `${trip.passenger.fullName} marked as boarded`, variant: "success" });
      reload();
    } catch (err) {
      showToast({ title: "Failed to update status", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function handleNoShow(trip) {
    try {
      await apiClient.patch(`/records/${trip.id}/status`, { status: "NO_SHOW" });
      showToast({ title: `${trip.passenger.fullName} marked as no-show`, variant: "info" });
      reload();
    } catch (err) {
      showToast({ title: "Failed to update status", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function handleCancelConfirm(reason) {
    try {
      await apiClient.patch(`/records/${cancelTarget.id}/status`, { status: "CANCELLED", reason });
      showToast({ title: "Booking cancelled", variant: "success" });
      reload();
    } catch (err) {
      showToast({ title: "Failed to cancel booking", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function handleRebookConfirm(scheduleId) {
    try {
      const res = await apiClient.post(`/records/${rebookTarget.id}/rebook`, { scheduleId });
      showToast({
        title: "Passenger rebooked",
        description: `New pass number ${res.data.trip.passNumber}`,
        variant: "success",
      });
      reload();
    } catch (err) {
      showToast({ title: "Failed to rebook", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function handleMarkRefundProcessed(trip) {
    try {
      await apiClient.patch(`/records/${trip.id}/refund-processed`);
      showToast({ title: `Refund marked processed for ${trip.passenger.fullName}`, variant: "success" });
      reload();
    } catch (err) {
      showToast({ title: "Failed to mark refund processed", description: err.response?.data?.message, variant: "error" });
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-graphite">Passenger Manifest &amp; Records</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search, filter, and export passenger trip logs for Port Authority / PCG clearance.
        </p>
      </header>

      <SeaConditionControl />
      <VesselCapacityStats onViewManifest={setManifestScheduleId} />

      {summary && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Matching Records" value={summary.total} icon={Users} accent />
          <StatCard label="Local Passengers" value={summary.local} icon={MapPin} accentColor="green" />
          <StatCard label="Tourist Passengers" value={summary.tourist} icon={Plane} accentColor="violet" />
        </div>
      )}

      <RecordsFilters filters={filters} onChange={setFilters} ships={ships} />
      <RecordsTable
        rows={rows}
        total={total}
        isLoading={isLoading}
        onExport={handleExport}
        isExporting={isExporting}
        onBoard={handleBoard}
        onNoShow={handleNoShow}
        onCancel={setCancelTarget}
        onRebook={setRebookTarget}
        onViewManifest={(trip) => setManifestScheduleId(trip.scheduleId)}
        onMarkRefundProcessed={handleMarkRefundProcessed}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <CancelBookingModal
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        trip={cancelTarget}
        onConfirm={handleCancelConfirm}
      />
      <RebookModal
        open={!!rebookTarget}
        onOpenChange={(open) => !open && setRebookTarget(null)}
        trip={rebookTarget}
        onConfirm={handleRebookConfirm}
      />
      <ManifestModal
        open={!!manifestScheduleId}
        onOpenChange={(open) => !open && setManifestScheduleId(null)}
        scheduleId={manifestScheduleId}
      />
    </div>
  );
}
