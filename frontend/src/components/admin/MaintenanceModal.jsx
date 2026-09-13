import { useState } from "react";
import { Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function MaintenanceModal({ open, onOpenChange, schedule, onConfirm }) {
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onConfirm({ reason });
      setReason("");
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-graphite" />
          Set Under Maintenance
        </DialogTitle>
        <DialogDescription>
          The <span className="font-medium text-ink">{schedule.ship?.name}</span> sailing at{" "}
          <span className="font-medium text-ink">{schedule.departureTime}</span> will be hidden from the
          passenger kiosk until reactivated. Existing bookings are not affected.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="maintenanceReason">Reason (optional)</Label>
            <Input
              id="maintenanceReason"
              placeholder="e.g. Scheduled engine maintenance"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Saving..." : "Set Under Maintenance"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
