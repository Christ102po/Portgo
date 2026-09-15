import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Ship as ShipIcon, Armchair, Layers3 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { ShipFormDialog } from "../../components/admin/ShipFormDialog";
import { ShipClassesDialog } from "../../components/admin/ShipClassesDialog";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";
import { accommodationClassLabel } from "../../lib/accommodationClass";

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export default function ShipsPage() {
  const [ships, setShips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShip, setEditingShip] = useState(null);
  const [classesShip, setClassesShip] = useState(null);
  const { showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const res = await apiClient.get("/ships?all=1");
    setShips(res.data.ships);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingShip(null);
    setDialogOpen(true);
  }

  function openEdit(ship) {
    setEditingShip(ship);
    setDialogOpen(true);
  }

  async function handleSubmit(data) {
    if (editingShip) {
      await apiClient.put(`/ships/${editingShip.id}`, data);
      showToast({ title: "Ship updated", variant: "success" });
    } else {
      await apiClient.post("/ships", data);
      showToast({ title: "Ship added", variant: "success" });
    }
    await load();
  }

  async function handleDeactivate(ship) {
    await apiClient.delete(`/ships/${ship.id}`);
    showToast({ title: `${ship.name} deactivated`, variant: "info" });
    await load();
  }

  async function handleActivate(ship) {
    await apiClient.put(`/ships/${ship.id}`, { active: true });
    showToast({ title: `${ship.name} activated`, variant: "success" });
    await load();
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-graphite">Ships</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage vessels and control which accommodation choices each ship offers to passengers.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Ship
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-4">Ship</th>
                <th className="px-4 py-4">Code</th>
                <th className="px-4 py-4">Capacity</th>
                <th className="px-4 py-4">Accommodation</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && ships.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No ships yet.
                  </td>
                </tr>
              )}
              {!isLoading &&
                ships.map((ship) => {
                  const classes = Array.isArray(ship.classes) ? ship.classes : [];
                  return (
                    <tr key={ship.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                          <ShipIcon className="h-4 w-4 text-graphite" />
                          {ship.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{ship.code}</td>
                      <td className="px-4 py-4 text-slate-500">{ship.capacity} seats</td>
                      <td className="px-4 py-4">
                        {classes.length === 0 ? (
                          <div className="flex items-center gap-2">
                            <Armchair className="h-4 w-4 text-emerald-700" />
                            <div>
                              <p className="font-semibold text-slate-800">Economy only</p>
                              <p className="text-xs text-slate-400">No class selection at kiosk</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <Layers3 className="mt-0.5 h-4 w-4 text-emerald-700" />
                            <div>
                              <p className="font-semibold text-slate-800">{classes.length} type{classes.length === 1 ? "" : "s"}</p>
                              <p className="text-xs text-slate-400">
                                {classes.map((item) => `${accommodationClassLabel(item.className)} (${item.capacity})`).join(" • ")}
                              </p>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={ship.active ? "active" : "neutral"}>
                          {ship.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(ship)} title="Edit ship">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setClassesShip(ship)}
                            title="Manage accommodation setup"
                          >
                            <Armchair className="h-3.5 w-3.5" />
                          </Button>
                          {ship.active ? (
                            <Button variant="outline" size="sm" onClick={() => handleDeactivate(ship)} title="Deactivate ship">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button variant="accent" size="sm" onClick={() => handleActivate(ship)}>
                              Activate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <ShipFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ship={editingShip}
        onSubmit={handleSubmit}
      />
      <ShipClassesDialog
        open={!!classesShip}
        onOpenChange={(open) => !open && setClassesShip(null)}
        ship={classesShip}
        onSaved={load}
      />
    </div>
  );
}
