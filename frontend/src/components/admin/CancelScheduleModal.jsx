import { useEffect, useState } from "react";
import { CloudLightning, ArrowRightLeft, Banknote, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import { routeLabel } from "../../lib/route";

const CATEGORY_OPTIONS = [
  { value: "CANCELLED_WEATHER", label: "Weather (e.g. Gale Warning)" },
  { value: "CANCELLED_MAINTENANCE", label: "Vessel Maintenance" },
];

const ACTION_OPTIONS = [
  { value: "NONE", label: "Leave Cancelled", icon: Ban, description: "No further action on affected bookings." },
  {
    value: "REASSIGN",
    label: "Batch Reassign",
    icon: ArrowRightLeft,
    description: "Move all affected passengers to another sailing.",
  },
  {
    value: "REFUND",
    label: "Mark for PPA Refund",
    icon: Banknote,
    description: "Flag affected bookings for refund processing.",
  },
];

export function CancelScheduleModal({ open, onOpenChange, schedule, schedules = [], onConfirm }) {
  const [category, setCategory] = useState("CANCELLED_WEATHER");
  const [reason, setReason] = useState("");
  const [passengerAction, setPassengerAction] = useState("NONE");
  const [reassignToScheduleId, setReassignToScheduleId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory("CANCELLED_WEATHER");
      setReason("");
      setPassengerAction("NONE");
      setReassignToScheduleId(null);
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onConfirm({
        category,
        reason,
        reassignToScheduleId: passengerAction === "REASSIGN" ? reassignToScheduleId : undefined,
        markForRefund: passengerAction === "REFUND",
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (!schedule) return null;

  const reassignOptions = schedules
    .filter((s) => s.id !== schedule.id && s.active && s.status === "ACTIVE")
    .map((s) => ({
      value: s.id,
      label: `${s.ship?.name || "Ship"} — ${s.departureTime} — ${routeLabel(s.route)}`,
    }));

  const canSubmit =
    reason.trim() && (passengerAction !== "REASSIGN" || reassignToScheduleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <CloudLightning className="h-5 w-5 text-red-500" />
          Cancel Trip / Issue Advisory
        </DialogTitle>
        <DialogDescription>
          Cancel the <span className="font-medium text-ink">{schedule.ship?.name}</span> sailing at{" "}
          <span className="font-medium text-ink">{schedule.departureTime}</span>. Choose what should happen to
          currently active bookings on this schedule.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label>Cancellation Category</Label>
            <Select value={category} onValueChange={setCategory} options={CATEGORY_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="scheduleCancelReason">Reason</Label>
            <Input
              id="scheduleCancelReason"
              placeholder="e.g. Gale Warning #3 issued by PAGASA / Coast Guard Advisory"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Affected Passengers</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ACTION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = passengerAction === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPassengerAction(opt.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
                      selected ? "border-graphite bg-mint/20" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-slate-500">{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {passengerAction === "REASSIGN" && (
            <div>
              <Label>Reassign To Sailing</Label>
              <Select
                value={reassignToScheduleId}
                onValueChange={setReassignToScheduleId}
                options={reassignOptions}
                placeholder={reassignOptions.length ? "Select a sailing" : "No other active sailings available"}
                disabled={reassignOptions.length === 0}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Each affected passenger receives a new pass and QR code for the selected sailing; their original
                booking is marked Rebooked.
              </p>
            </div>
          )}

          <Button type="submit" variant="danger" className="w-full" disabled={isSaving || !canSubmit}>
            {isSaving ? "Processing..." : "Confirm Trip Cancellation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
