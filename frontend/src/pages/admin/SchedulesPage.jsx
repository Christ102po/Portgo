import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  CloudLightning,
  RotateCcw,
  Clock3,
  Wrench,
  FileText,
  Search,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { Switch } from "../../components/ui/Switch";
import { ScheduleFormDialog } from "../../components/admin/ScheduleFormDialog";
import { CancelScheduleModal } from "../../components/admin/CancelScheduleModal";
import { DelayScheduleModal } from "../../components/admin/DelayScheduleModal";
import { MaintenanceModal } from "../../components/admin/MaintenanceModal";
import { ManifestModal } from "../../components/admin/ManifestModal";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";
import { routeLabel } from "../../lib/route";
import { cn } from "../../lib/cn";

const CANCEL_BADGE = {
  CANCELLED_WEATHER: { variant: "danger", label: "Weather Cancellation" },
  CANCELLED_MAINTENANCE: { variant: "warning", label: "Maintenance Cancellation" },
  MAINTENANCE: { variant: "warning", label: "Under Maintenance" },
  DELAYED: { variant: "warning", label: "Delayed" },
};

const TABS = [
  { value: "ALL", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "UNAVAILABLE", label: "Unavailable" },
  { value: "DELAYED", label: "Delayed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function matchesTab(s, tab) {
  if (tab === "ALL") return true;
  if (tab === "AVAILABLE") return s.active && ["ACTIVE", "DELAYED"].includes(s.status);
  if (tab === "UNAVAILABLE") return !s.active;
  if (tab === "DELAYED") return s.status === "DELAYED";
  if (tab === "CANCELLED") return ["CANCELLED_WEATHER", "CANCELLED_MAINTENANCE", "MAINTENANCE"].includes(s.status);
  return true;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-4 w-full max-w-[100px]" />
        </td>
      ))}
    </tr>
  );
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [ships, setShips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [delayTarget, setDelayTarget] = useState(null);
  const [maintenanceTarget, setMaintenanceTarget] = useState(null);
  const [manifestScheduleId, setManifestScheduleId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [selected, setSelected] = useState(new Set());
  const { showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const [schedulesRes, shipsRes] = await Promise.all([
      apiClient.get("/schedules?all=1"),
      apiClient.get("/ships?all=1"),
    ]);
    setSchedules(schedulesRes.data.schedules);
    setShips(shipsRes.data.ships);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredSchedules = useMemo(() => {
    const term = search.trim().toLowerCase();
    return schedules.filter((s) => {
      if (!matchesTab(s, activeTab)) return false;
      if (!term) return true;
      return (
        s.ship?.name.toLowerCase().includes(term) ||
        routeLabel(s.route).toLowerCase().includes(term) ||
        s.departureTime.toLowerCase().includes(term)
      );
    });
  }, [schedules, search, activeTab]);

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filteredSchedules.length ? new Set() : new Set(filteredSchedules.map((s) => s.id))
    );
  }

  function openCreate() {
    setEditingSchedule(null);
    setDialogOpen(true);
  }

  function openEdit(schedule) {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  }

  async function handleSubmit(data) {
    if (editingSchedule) {
      await apiClient.put(`/schedules/${editingSchedule.id}`, data);
      showToast({ title: "Schedule updated", variant: "success" });
    } else {
      await apiClient.post("/schedules", data);
      showToast({ title: "Schedule added", variant: "success" });
    }
    await load();
  }

  async function handleAvailability(schedule, nextActive) {
    try {
      await apiClient.put(`/schedules/${schedule.id}`, { active: nextActive });
      showToast({
        title: nextActive ? "Schedule is now available" : "Schedule is now unavailable",
        description: nextActive
          ? "Passengers can select this sailing when its operational status permits booking."
          : "This sailing is hidden from passenger registration but remains in admin records.",
        variant: nextActive ? "success" : "info",
      });
      await load();
    } catch (err) {
      showToast({ title: "Unable to update availability", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function handleDelete(schedule) {
    const ok = window.confirm(
      `Delete ${schedule.ship?.name || "this ship"} — ${schedule.departureTime}?\n\nUnused schedules are permanently deleted. Schedules with passenger records cannot be deleted and should be marked Unavailable instead.`
    );
    if (!ok) return;
    try {
      await apiClient.delete(`/schedules/${schedule.id}`);
      showToast({ title: "Schedule deleted", variant: "success" });
      await load();
    } catch (err) {
      showToast({
        title: "Schedule cannot be deleted",
        description: err.response?.data?.message || "Mark the schedule Unavailable instead.",
        variant: "error",
      });
    }
  }

  async function handleCancelTrip({ category, reason, reassignToScheduleId, markForRefund }) {
    const res = await apiClient.post(`/schedules/${cancelTarget.id}/cancel`, {
      category,
      reason,
      reassignToScheduleId,
      markForRefund,
    });
    const { affectedTrips, reassignedCount, refundCount } = res.data;
    const description = reassignToScheduleId
      ? `${reassignedCount} of ${affectedTrips} passenger(s) batch-reassigned to the new sailing.`
      : `${affectedTrips} booking${affectedTrips === 1 ? "" : "s"} flagged as cancelled${
          refundCount ? `, ${refundCount} marked for PPA refund processing` : ""
        }.`;
    showToast({ title: "Trip cancelled", description, variant: "success" });
    await load();
  }

  async function handleDelay({ minutes, reason }) {
    await apiClient.post(`/schedules/${delayTarget.id}/delay`, { minutes, reason });
    showToast({ title: `Marked delayed +${minutes} min`, variant: "info" });
    await load();
  }

  async function handleMaintenance({ reason }) {
    await apiClient.post(`/schedules/${maintenanceTarget.id}/maintenance`, { reason });
    showToast({ title: "Schedule set under maintenance", variant: "info" });
    await load();
  }

  async function handleReactivate(schedule) {
    await apiClient.post(`/schedules/${schedule.id}/reactivate`);
    showToast({ title: "Schedule reactivated", variant: "success" });
    await load();
  }

  async function handleBulkAction(action) {
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) => apiClient.put(`/schedules/${id}`, { active: action === "activate" }))
    );
    showToast({
      title: `${ids.length} schedule${ids.length === 1 ? "" : "s"} ${action === "activate" ? "activated" : "deactivated"}`,
      variant: "success",
    });
    setSelected(new Set());
    await load();
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-graphite">Schedules</h1>
          <p className="mt-1 text-sm text-slate-500">Manage sailing times, passenger availability, and operational status for each route.</p>
        </div>
        <Button onClick={openCreate} disabled={ships.length === 0}>
          <Plus className="h-4 w-4" />
          Add Schedule
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
                activeTab === tab.value ? "bg-graphite text-mint shadow-soft" : "text-slate-500 hover:text-graphite"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search ship, route, or time"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-graphite/20 bg-graphite px-4 py-3 text-white">
          <p className="text-sm font-medium">{selected.size} schedule{selected.size === 1 ? "" : "s"} selected</p>
          <div className="flex gap-2">
            <Button variant="accent" size="sm" onClick={() => handleBulkAction("activate")}>
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              onClick={() => handleBulkAction("deactivate")}
            >
              Deactivate
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
              <th className="w-10 px-4 py-4">
                <input
                  type="checkbox"
                  checked={filteredSchedules.length > 0 && selected.size === filteredSchedules.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-4">Ship</th>
              <th className="px-4 py-4">Route</th>
              <th className="px-4 py-4 text-center">Departure</th>
              <th className="px-4 py-4 text-center">Days</th>
              <th className="px-4 py-4 text-center">Seats</th>
              <th className="px-4 py-4 text-center">Passenger Availability</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
            {!isLoading && filteredSchedules.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No Schedules Found</p>
                    <p className="text-xs text-slate-400">No schedules match your current search or filter.</p>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading &&
              filteredSchedules.map((s) => {
                const isCancelled = ["CANCELLED_WEATHER", "CANCELLED_MAINTENANCE", "MAINTENANCE"].includes(
                  s.status
                );
                const cancelBadge = CANCEL_BADGE[s.status];
                const isLowSeats = s.capacity != null && !s.isFull && s.seatsLeft <= 5;
                return (
                  <tr key={s.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelected(s.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {s.ship?.name}
                      {s.voyageNumber && <p className="text-xs text-slate-400">Voyage {s.voyageNumber}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline">{routeLabel(s.route)}</Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm text-slate-800">
                        <Clock className="h-3.5 w-3.5 text-graphite" />
                        {s.departureTime}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500">{s.daysOfWeek}</td>
                    <td className="px-4 py-4 text-center">
                      {s.capacity != null && (
                        <Badge variant={s.isFull ? "danger" : isLowSeats ? "warning" : "outline"}>
                          {s.bookedCount} booked &bull; {s.isFull ? "Full" : `${s.seatsLeft} left`}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                          <Switch
                            checked={s.active}
                            onCheckedChange={(checked) => handleAvailability(s, checked)}
                            aria-label={`${s.ship?.name || "Schedule"} availability`}
                            className="h-6 w-10 [&>span]:h-4 [&>span]:w-4 data-[state=checked]:[&>span]:translate-x-5"
                          />
                          <span className={cn("text-[11px] font-bold", s.active ? "text-emerald-700" : "text-slate-500")}>
                            {s.active ? "Available" : "Unavailable"}
                          </span>
                        </div>
                        {s.status !== "ACTIVE" && cancelBadge ? (
                          <Badge
                            variant={cancelBadge.variant}
                            title={s.status === "DELAYED" ? s.delayReason : s.cancellationReason}
                          >
                            {s.status === "DELAYED" ? `Delayed +${s.delayMinutes}m` : cancelBadge.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Operational</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={() => setManifestScheduleId(s.id)}
                          title="Manifest"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        {isCancelled ? (
                          <Button variant="accent" size="sm" className="rounded-full" onClick={() => handleReactivate(s)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reactivate
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              onClick={() => setDelayTarget(s)}
                              title="Delay"
                            >
                              <Clock3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                              onClick={() => setMaintenanceTarget(s)}
                              title="Maintenance"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              onClick={() => setCancelTarget(s)}
                              title="Cancel"
                            >
                              <CloudLightning className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => openEdit(s)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => handleDelete(s)}
                          title="Delete unused schedule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        </div>
      </div>

      <ScheduleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editingSchedule}
        ships={ships}
        onSubmit={handleSubmit}
      />
      <CancelScheduleModal
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        schedule={cancelTarget}
        schedules={schedules}
        onConfirm={handleCancelTrip}
      />
      <DelayScheduleModal
        open={!!delayTarget}
        onOpenChange={(open) => !open && setDelayTarget(null)}
        schedule={delayTarget}
        onConfirm={handleDelay}
      />
      <MaintenanceModal
        open={!!maintenanceTarget}
        onOpenChange={(open) => !open && setMaintenanceTarget(null)}
        schedule={maintenanceTarget}
        onConfirm={handleMaintenance}
      />
      <ManifestModal
        open={!!manifestScheduleId}
        onOpenChange={(open) => !open && setManifestScheduleId(null)}
        scheduleId={manifestScheduleId}
      />
    </div>
  );
}
