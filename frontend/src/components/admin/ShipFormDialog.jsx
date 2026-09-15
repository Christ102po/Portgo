import { useEffect, useMemo, useState } from "react";
import { Armchair, Layers3 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

const CLASS_OPTIONS = [
  { value: "ECONOMY", label: "Economy", description: "Standard seating" },
  { value: "TOURIST_AIRCON", label: "Tourist Aircon", description: "Air-conditioned cabin" },
  { value: "BUSINESS", label: "Business", description: "Premium / VIP seating" },
];

export function ShipFormDialog({ open, onOpenChange, ship, onSubmit }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [hasAccommodationTypes, setHasAccommodationTypes] = useState(false);
  const [enabledClasses, setEnabledClasses] = useState({ ECONOMY: true, TOURIST_AIRCON: false, BUSINESS: false });
  const [classCapacities, setClassCapacities] = useState({ ECONOMY: "100", TOURIST_AIRCON: "0", BUSINESS: "0" });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const totalCapacity = String(ship?.capacity ?? 100);
    const configured = Array.isArray(ship?.classes) ? ship.classes : [];
    const hasTypes = configured.length > 0;

    setName(ship?.name || "");
    setCode(ship?.code || "");
    setCapacity(totalCapacity);
    setHasAccommodationTypes(hasTypes);
    setEnabledClasses({
      ECONOMY: hasTypes ? configured.some((c) => c.className === "ECONOMY") : true,
      TOURIST_AIRCON: configured.some((c) => c.className === "TOURIST_AIRCON"),
      BUSINESS: configured.some((c) => c.className === "BUSINESS"),
    });
    setClassCapacities({
      ECONOMY: String(configured.find((c) => c.className === "ECONOMY")?.capacity ?? totalCapacity),
      TOURIST_AIRCON: String(configured.find((c) => c.className === "TOURIST_AIRCON")?.capacity ?? 0),
      BUSINESS: String(configured.find((c) => c.className === "BUSINESS")?.capacity ?? 0),
    });
    setFormError("");
  }, [open, ship]);

  const selectedClasses = useMemo(
    () =>
      CLASS_OPTIONS.filter((opt) => enabledClasses[opt.value]).map((opt) => ({
        className: opt.value,
        capacity: Number(classCapacities[opt.value] || 0),
      })),
    [enabledClasses, classCapacities]
  );

  const configuredTotal = selectedClasses.reduce((sum, item) => sum + (Number.isFinite(item.capacity) ? item.capacity : 0), 0);
  const totalCapacity = Number(capacity || 0);

  function chooseMode(value) {
    setHasAccommodationTypes(value);
    setFormError("");
    if (value && !Object.values(enabledClasses).some(Boolean)) {
      setEnabledClasses((prev) => ({ ...prev, ECONOMY: true }));
      setClassCapacities((prev) => ({ ...prev, ECONOMY: capacity || "100" }));
    }
  }

  function toggleClass(className) {
    setEnabledClasses((prev) => ({ ...prev, [className]: !prev[className] }));
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    let classes = [];
    if (hasAccommodationTypes) {
      classes = selectedClasses.filter((item) => item.capacity > 0);
      if (classes.length === 0) {
        setFormError("Select at least one accommodation type and give it a seat capacity greater than 0.");
        return;
      }
      if (configuredTotal > totalCapacity) {
        setFormError(`Accommodation capacities total ${configuredTotal}, which is greater than the ship capacity of ${totalCapacity}.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSubmit({ name, code, capacity: totalCapacity, classes });
      onOpenChange(false);
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || "Unable to save ship.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>{ship ? "Edit Ship" : "Add Ship"}</DialogTitle>
        <DialogDescription>
          {ship
            ? "Update the vessel and control which accommodation choices passengers can see."
            : "Register a vessel and choose whether it is Economy-only or offers accommodation types."}
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="shipName">Ship Name</Label>
              <Input id="shipName" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="shipCode">Code</Label>
              <Input id="shipCode" value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
          </div>

          <div>
            <Label htmlFor="shipCapacity">Passenger Capacity</Label>
            <Input
              id="shipCapacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Accommodation Setup</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseMode(false)}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition",
                  !hasAccommodationTypes
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Armchair className="h-5 w-5 text-emerald-700" />
                  Economy only
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  No accommodation-type picker is shown to passengers. The whole vessel uses Economy seating.
                </p>
              </button>

              <button
                type="button"
                onClick={() => chooseMode(true)}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition",
                  hasAccommodationTypes
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Layers3 className="h-5 w-5 text-emerald-700" />
                  Has accommodation types
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Passengers will only see the accommodation types you enable below.
                </p>
              </button>
            </div>
          </div>

          {hasAccommodationTypes && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">Available accommodation types</p>
                  <p className="text-xs text-slate-500">Enable only the classes actually offered by this ship.</p>
                </div>
                <span className={cn("text-xs font-semibold", configuredTotal > totalCapacity ? "text-red-600" : "text-slate-500")}>
                  Configured: {configuredTotal || 0} / {totalCapacity || 0} seats
                </span>
              </div>

              <div className="space-y-3">
                {CLASS_OPTIONS.map((opt) => {
                  const checked = !!enabledClasses[opt.value];
                  return (
                    <div key={opt.value} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_150px] sm:items-center">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleClass(opt.value)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                        />
                        <span>
                          <span className="block text-sm font-bold text-slate-900">{opt.label}</span>
                          <span className="block text-xs text-slate-500">{opt.description}</span>
                        </span>
                      </label>
                      <div>
                        <Label htmlFor={`ship-class-${opt.value}`} className="text-xs">Seats</Label>
                        <Input
                          id={`ship-class-${opt.value}`}
                          type="number"
                          min="0"
                          disabled={!checked}
                          value={classCapacities[opt.value] ?? "0"}
                          onChange={(e) => setClassCapacities((prev) => ({ ...prev, [opt.value]: e.target.value }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                The combined class capacities cannot exceed the vessel's passenger capacity.
              </p>
            </div>
          )}

          {formError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</div>}

          <Button type="submit" className="w-full" disabled={isSaving || totalCapacity < 1}>
            {isSaving ? "Saving..." : "Save Ship"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
