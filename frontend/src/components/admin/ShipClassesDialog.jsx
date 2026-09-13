import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";

const CLASS_OPTIONS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "TOURIST_AIRCON", label: "Tourist Aircon" },
  { value: "BUSINESS", label: "Business" },
];

export function ShipClassesDialog({ open, onOpenChange, ship }) {
  const [capacities, setCapacities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open || !ship) return;
    setIsLoading(true);
    apiClient
      .get(`/ships/${ship.id}/classes`)
      .then((res) => {
        const next = {};
        for (const opt of CLASS_OPTIONS) next[opt.value] = "0";
        for (const c of res.data.classes) next[c.className] = String(c.capacity);
        setCapacities(next);
      })
      .finally(() => setIsLoading(false));
  }, [open, ship]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const classes = CLASS_OPTIONS.map((opt) => ({
        className: opt.value,
        capacity: Number(capacities[opt.value] || 0),
      }));
      await apiClient.put(`/ships/${ship.id}/classes`, { classes });
      showToast({ title: "Accommodation classes updated", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      showToast({ title: "Failed to update classes", description: err.response?.data?.message, variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Accommodation Classes — {ship?.name}</DialogTitle>
        <DialogDescription>
          Set a seat capacity for each class. Leave a class at 0 to hide it from the kiosk (ship-wide
          capacity is still tracked separately).
        </DialogDescription>

        {isLoading ? (
          <p className="mt-5 text-center text-sm text-slate-400">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {CLASS_OPTIONS.map((opt) => (
              <div key={opt.value}>
                <Label htmlFor={`class-${opt.value}`}>{opt.label} Capacity</Label>
                <Input
                  id={`class-${opt.value}`}
                  type="number"
                  min="0"
                  value={capacities[opt.value] ?? "0"}
                  onChange={(e) => setCapacities((prev) => ({ ...prev, [opt.value]: e.target.value }))}
                />
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Classes"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
