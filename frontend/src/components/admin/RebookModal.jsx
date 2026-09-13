import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { apiClient } from "../../lib/apiClient";

export function RebookModal({ open, onOpenChange, trip, onConfirm }) {
  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !trip) return;
    setIsLoading(true);
    setScheduleId(null);
    apiClient
      .get("/schedules", { params: { route: trip.schedule.route } })
      .then((res) => setSchedules(res.data.schedules.filter((s) => s.id !== trip.scheduleId)))
      .finally(() => setIsLoading(false));
  }, [open, trip]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onConfirm(scheduleId);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (!trip) return null;

  const options = schedules.map((s) => ({
    value: s.id,
    label: `${s.ship.name} — ${s.departureTime}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-graphite" />
          Rebook to Next Schedule
        </DialogTitle>
        <DialogDescription>
          Move <span className="font-medium text-ink">{trip.passenger.fullName}</span> ({trip.passNumber}) to a
          different sailing. The current booking will be marked as rebooked.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label>New Schedule</Label>
            <Select
              value={scheduleId}
              onValueChange={setScheduleId}
              options={options}
              placeholder={isLoading ? "Loading schedules..." : options.length ? "Select a schedule" : "No other schedules available"}
              disabled={isLoading || options.length === 0}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving || !scheduleId}>
            {isSaving ? "Rebooking..." : "Confirm Rebooking"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
