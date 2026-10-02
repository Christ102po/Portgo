import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MapPin, Plane } from "lucide-react";
import { RecordsFilters, EMPTY_RECORDS_FILTERS } from "../../components/admin/RecordsFilters";
import { RecordsTable } from "../../components/admin/RecordsTable";
import { Pagination } from "../../components/admin/Pagination";
import { StatCard } from "../../components/admin/StatCard";
import { apiClient, downloadWithAuth } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";
import { confirmDelete, sweetError, sweetSuccess } from "../../lib/sweetAlert";

const PAGE_SIZE = 10;

export default function RecordsPage({ recordCategory }) {
  const location = useLocation();
  const [ships, setShips] = useState([]);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_RECORDS_FILTERS, search: location.state?.presetSearch || "" }));
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => { apiClient.get("/ships?all=1").then((res) => setShips(res.data.ships || [])); }, []);
  useEffect(() => { setPage(1); }, [filters, recordCategory]);

  function reload() {
    setIsLoading(true);
    const params = { ...filters, page, pageSize: PAGE_SIZE, recordCategory };
    Object.keys(params).forEach((key) => !params[key] && delete params[key]);
    return apiClient.get("/records", { params }).then((res) => {
      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    }).finally(() => setIsLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(reload, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, recordCategory]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = { ...filters, recordCategory };
      Object.keys(params).forEach((key) => !params[key] && delete params[key]);
      const query = new URLSearchParams(params).toString();
      const prefix = recordCategory === "TOURIST" ? "tourist" : "local-passenger";
      await downloadWithAuth(`/records/export?${query}`, `portgo-${prefix}-records-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      showToast({ title: "Export failed", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeletePassenger(trip) {
    const name = trip.passenger?.fullName || "this passenger";
    const ok = await confirmDelete({
      title: `Delete ${name}?`,
      text: "This permanently deletes this passenger registration and its connected trip record.",
      confirmButtonText: "Yes, delete",
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/passengers/${trip.passengerId || trip.passenger?.id}`);
      sweetSuccess("Passenger deleted", `${name}'s record was permanently removed.`);
      reload();
    } catch (err) {
      sweetError("Delete failed", err.response?.data?.message || "Passenger data could not be deleted.");
    }
  }

  const tourist = recordCategory === "TOURIST";
  const title = tourist ? "Tourist Records" : "Local Passenger Records";
  const description = tourist
    ? "Tourist registrations submitted through the Tourist Fill-Up Form."
    : "Local passenger registrations submitted through the Local Passenger Fill-Up Form.";

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-graphite">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </header>

      <div className="mb-5 max-w-sm">
        <StatCard label={tourist ? "Total Tourist Records" : "Total Local Passenger Records"} value={total} icon={tourist ? Plane : MapPin} accentColor={tourist ? "violet" : "green"} />
      </div>

      <RecordsFilters filters={filters} onChange={setFilters} ships={ships} />
      <RecordsTable rows={rows} total={total} isLoading={isLoading} onExport={handleExport} isExporting={isExporting} onDeletePassenger={handleDeletePassenger} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
