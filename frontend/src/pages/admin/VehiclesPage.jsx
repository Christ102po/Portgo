import { useEffect, useState } from "react";
import { Search, X, Car } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Pagination } from "../../components/admin/Pagination";
import { apiClient } from "../../lib/apiClient";
import { routeLabel } from "../../lib/route";
import { tripStatusBadge } from "../../lib/tripStatus";

const PAGE_SIZE = 15;
const EMPTY_FILTERS = { search: "", date: "", shipId: "", vehicleType: "" };

const VEHICLE_TYPE_OPTIONS = [
  { value: "ALL", label: "All Vehicle Types" },
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "SEDAN_SUV", label: "Sedan / SUV" },
  { value: "TRUCK_CARGO", label: "Truck / Cargo" },
];

const VEHICLE_TYPE_LABEL = {
  MOTORCYCLE: "Motorcycle",
  SEDAN_SUV: "Sedan / SUV",
  TRUCK_CARGO: "Truck / Cargo",
};

export default function VehiclesPage() {
  const [ships, setShips] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/ships?all=1").then((res) => setShips(res.data.ships));
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
        .get("/vehicles", { params })
        .then((res) => {
          setRows(res.data.rows);
          setTotal(res.data.total);
        })
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters, page]);

  function set(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  const shipOptions = [
    { value: "ALL", label: "All Ships" },
    ...ships.map((s) => ({ value: s.id, label: s.name })),
  ];

  const activeChips = Object.entries(filters).filter(([, v]) => v);

  return (
    <div>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-graphite">
          <Car className="h-6 w-6" />
          Vehicle &amp; Cargo Manifest
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          All bookings traveling with a vehicle, across every sailing.
        </p>
      </header>

      <div className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search plate number or name"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
            />
          </div>
          <Input type="date" value={filters.date} onChange={(e) => set("date", e.target.value)} />
          <Select
            value={filters.shipId || "ALL"}
            onValueChange={(v) => set("shipId", v === "ALL" ? "" : v)}
            options={shipOptions}
          />
          <Select
            value={filters.vehicleType || "ALL"}
            onValueChange={(v) => set("vehicleType", v === "ALL" ? "" : v)}
            options={VEHICLE_TYPE_OPTIONS}
          />
        </div>

        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {activeChips.map(([field, value]) => (
              <button
                key={field}
                onClick={() => set(field, "")}
                className="inline-flex items-center gap-1 rounded-full bg-graphite/5 px-2.5 py-1 text-xs font-medium text-graphite transition-colors hover:bg-graphite/10"
              >
                {field === "shipId" ? ships.find((s) => s.id === value)?.name || value : value}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Plate Number</th>
                <th className="px-4 py-3 font-semibold">Vehicle Type</th>
                <th className="px-4 py-3 font-semibold">Driver / Passenger</th>
                <th className="px-4 py-3 font-semibold">Ship</th>
                <th className="px-4 py-3 font-semibold">Route</th>
                <th className="px-4 py-3 font-semibold">Departure</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No vehicle bookings found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows.map((trip) => {
                  const badge = tripStatusBadge(trip.status);
                  return (
                    <tr key={trip.id} className="border-b border-slate-50 last:border-0 hover:bg-surface/60">
                      <td className="px-4 py-3 font-mono font-semibold text-ink">{trip.plateNumber || "—"}</td>
                      <td className="px-4 py-3 text-ink">
                        {VEHICLE_TYPE_LABEL[trip.vehicleType] || trip.vehicleType}
                      </td>
                      <td className="px-4 py-3 text-ink">{trip.passenger.fullName}</td>
                      <td className="px-4 py-3 text-ink">{trip.ship.name}</td>
                      <td className="px-4 py-3 text-slate-500">{routeLabel(trip.schedule.route)}</td>
                      <td className="px-4 py-3 text-slate-500">{trip.schedule.departureTime}</td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
