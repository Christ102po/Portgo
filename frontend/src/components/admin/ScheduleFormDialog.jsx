import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

const ROUTE_OPTIONS = [
  { value: "SURIGAO_TO_DAPA", label: "Surigao to Dapa" },
  { value: "DAPA_TO_SURIGAO", label: "Dapa to Surigao" },
];

export function ScheduleFormDialog({ open, onOpenChange, schedule, ships, onSubmit }) {
  const [route, setRoute] = useState("SURIGAO_TO_DAPA");
  const [departureTime, setDepartureTime] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState("Mon-Sun");
  const [voyageNumber, setVoyageNumber] = useState("");
  const [shipId, setShipId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRoute(schedule?.route || "SURIGAO_TO_DAPA");
      setDepartureTime(schedule?.departureTime || "");
      setDaysOfWeek(schedule?.daysOfWeek || "Mon-Sun");
      setVoyageNumber(schedule?.voyageNumber || "");
      setShipId(schedule?.shipId || ships[0]?.id || null);
    }
  }, [open, schedule, ships]);

  const shipOptions = ships.map((s) => ({ value: s.id, label: s.name }));

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({ route, departureTime, daysOfWeek, voyageNumber: voyageNumber || null, shipId });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{schedule ? "Edit Schedule" : "Add Schedule"}</DialogTitle>
        <DialogDescription>
          {schedule ? "Update this departure schedule." : "Create a new departure schedule."}
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label>Ship</Label>
            <Select
              value={shipId}
              onValueChange={setShipId}
              options={shipOptions}
              placeholder="Select a ship"
            />
          </div>
          <div>
            <Label>Route</Label>
            <Select value={route} onValueChange={setRoute} options={ROUTE_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="departureTime">Departure Time</Label>
            <Input
              id="departureTime"
              placeholder="e.g. 06:00 AM"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="daysOfWeek">Days of Week</Label>
            <Input
              id="daysOfWeek"
              placeholder="e.g. Mon-Sun"
              value={daysOfWeek}
              onChange={(e) => setDaysOfWeek(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="voyageNumber">Voyage No. (optional)</Label>
            <Input
              id="voyageNumber"
              placeholder="e.g. VY-2026-0142"
              value={voyageNumber}
              onChange={(e) => setVoyageNumber(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving || !shipId}>
            {isSaving ? "Saving..." : "Save Schedule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
