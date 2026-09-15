import { useEffect, useMemo, useState } from "react";
import { Armchair, Layers3 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";
import { cn } from "../../lib/cn";

const CLASS_OPTIONS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "TOURIST_AIRCON", label: "Tourist Aircon" },
  { value: "BUSINESS", label: "Business" },
];

export function ShipClassesDialog({ open, onOpenChange, ship, onSaved }) {
  const [hasTypes, setHasTypes] = useState(false);
  const [capacities, setCapacities] = useState({});
  const [enabled, setEnabled] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open || !ship) return;
    setIsLoading(true);
    apiClient
      .get(`/ships/${ship.id}/classes`)
      .then((res) => {
        const classes = res.data.classes || [];
        const nextCaps = {};
        const nextEnabled = {};
        for (const opt of CLASS_OPTIONS) {
          const item = classes.find((c) => c.className === opt.value);
          nextCaps[opt.value] = String(item?.capacity ?? 0);
          nextEnabled[opt.value] = !!item;
        }
        setHasTypes(classes.length > 0);
        setCapacities(nextCaps);
        setEnabled(nextEnabled);
      })
      .finally(() => setIsLoading(false));
  }, [open, ship]);

  const configuredTotal = useMemo(
    () =>
      CLASS_OPTIONS.reduce(
        (sum, opt) => sum + (enabled[opt.value] ? Number(capacities[opt.value] || 0) : 0),
        0
      ),
    [enabled, capacities]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const classes = hasTypes
        ? CLASS_OPTIONS.filter((opt) => enabled[opt.value] && Number(capacities[opt.value] || 0) > 0).map((opt) => ({
            className: opt.value,
            capacity: Number(capacities[opt.value]),
          }))
        : [];

      if (hasTypes && classes.length === 0) {
        showToast({ title: "Select at least one accommodation type", variant: "error" });
        return;
      }
      if (configuredTotal > Number(ship?.capacity || 0)) {
        showToast({
          title: "Class capacity is too high",
          description: `Configured classes total ${configuredTotal} seats but ${ship?.name} only has ${ship?.capacity} seats.`,
          variant: "error",
        });
        return;
      }

      await apiClient.put(`/ships/${ship.id}/classes`, { classes });
      showToast({
        title: hasTypes ? "Accommodation types updated" : "Ship set to Economy only",
        variant: "success",
      });
      onOpenChange(false);
      await onSaved?.();
    } catch (err) {
      showToast({ title: "Failed to update accommodation", description: err.response?.data?.message, variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>Accommodation — {ship?.name}</DialogTitle>
        <DialogDescription>
          Economy-only vessels do not show a class picker at the kiosk. Vessels with accommodation types show only the types enabled here.
        </DialogDescription>

        {isLoading ? (
          <p className="mt-5 text-center text-sm text-slate-400">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setHasTypes(false)}
                className={cn(
                  "rounded-xl border-2 p-3 text-left",
                  !hasTypes ? "border-emerald-500 bg-emerald-50" : "border-slate-200"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Armchair className="h-4 w-4 text-emerald-700" /> Economy only
                </span>
                <span className="mt-1 block text-xs text-slate-500">Uses the full ship capacity.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasTypes(true);
                  if (!Object.values(enabled).some(Boolean)) {
                    setEnabled((prev) => ({ ...prev, ECONOMY: true }));
                    setCapacities((prev) => ({ ...prev, ECONOMY: String(ship?.capacity || 0) }));
                  }
                }}
                className={cn(
                  "rounded-xl border-2 p-3 text-left",
                  hasTypes ? "border-emerald-500 bg-emerald-50" : "border-slate-200"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Layers3 className="h-4 w-4 text-emerald-700" /> Has types
                </span>
                <span className="mt-1 block text-xs text-slate-500">Configure only the classes this vessel offers.</span>
              </button>
            </div>

            {hasTypes && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between gap-3 text-xs text-slate-500">
                  <span>Configured seat capacities</span>
                  <span className={configuredTotal > Number(ship?.capacity || 0) ? "font-bold text-red-600" : "font-semibold"}>
                    {configuredTotal} / {ship?.capacity} seats
                  </span>
                </div>
                {CLASS_OPTIONS.map((opt) => (
                  <div key={opt.value} className="grid gap-2 rounded-lg bg-white p-3 sm:grid-cols-[1fr_130px] sm:items-center">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={!!enabled[opt.value]}
                        onChange={() => setEnabled((prev) => ({ ...prev, [opt.value]: !prev[opt.value] }))}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      {opt.label}
                    </label>
                    <div>
                      <Label htmlFor={`class-${opt.value}`} className="text-xs">Seats</Label>
                      <Input
                        id={`class-${opt.value}`}
                        type="number"
                        min="0"
                        disabled={!enabled[opt.value]}
                        value={capacities[opt.value] ?? "0"}
                        onChange={(e) => setCapacities((prev) => ({ ...prev, [opt.value]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Accommodation Setup"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
