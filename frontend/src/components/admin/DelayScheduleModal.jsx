import { useState } from "react";
import { Clock3 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function DelayScheduleModal({ open, onOpenChange, schedule, onConfirm }) {
  const [minutes, setMinutes] = useState("30");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onConfirm({ minutes: Number(minutes), reason });
      setMinutes("30");
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
          <Clock3 className="h-5 w-5 text-amber-500" />
          Mark Delayed
        </DialogTitle>
        <DialogDescription>
          Delay the <span className="font-medium text-ink">{schedule.ship?.name}</span> sailing at{" "}
          <span className="font-medium text-ink">{schedule.departureTime}</span>. It stays bookable, with the
          delay shown to passengers on the kiosk.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="delayMinutes">Delay Duration (minutes)</Label>
            <Input
              id="delayMinutes"
              type="number"
              min="1"
              max="1440"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="delayReason">Reason</Label>
            <Input
              id="delayReason"
              placeholder="e.g. High Tide / Mechanical Check"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving || !reason.trim() || !minutes}>
            {isSaving ? "Saving..." : "Mark as Delayed"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
