import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function CancelBookingModal({ open, onOpenChange, trip, onConfirm }) {
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onConfirm(reason);
      setReason("");
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Cancel Booking
        </DialogTitle>
        <DialogDescription>
          Cancel <span className="font-medium text-ink">{trip.passenger.fullName}</span>&apos;s booking (
          {trip.passNumber}). This cannot be undone.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="cancelReason">Reason (optional)</Label>
            <Input
              id="cancelReason"
              placeholder="e.g. Passenger request, duplicate entry"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button type="submit" variant="danger" className="w-full" disabled={isSaving}>
            {isSaving ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
