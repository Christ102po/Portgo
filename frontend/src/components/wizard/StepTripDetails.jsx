import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Users, Clock3, Armchair, Snowflake, Star } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { apiClient } from "../../lib/apiClient";
import { cn } from "../../lib/cn";
import { routeLabel } from "../../lib/route";
import { useToast } from "../ui/Toast";
import { ACCOMMODATION_CLASSES } from "../../lib/accommodationClass";

const LOW_SEATS_THRESHOLD = 5;

const CLASS_ICONS = {
  ECONOMY: Armchair,
  TOURIST_AIRCON: Snowflake,
  BUSINESS: Star,
};

function AccommodationClassSelector({ classAvailability, value, onSelect }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Type of Accommodation / Seat Class <span className="text-red-500">*</span>
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ACCOMMODATION_CLASSES.map((meta) => {
          const Icon = CLASS_ICONS[meta.value] || Armchair;
          const availability = classAvailability?.find((c) => c.className === meta.value);
          const isFull = !!availability?.isFull;
          const selected = value === meta.value;
          return (
            <button
              key={meta.value}
              type="button"
              disabled={isFull}
              onClick={() => onSelect(meta.value)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border-2 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <span className="text-[11px] text-slate-500">{meta.subtitle}</span>
              {availability?.capacity != null && (
                <span className={cn("text-[11px] font-medium", isFull ? "text-red-600" : "text-slate-500")}>
                  {isFull ? "Full" : `${availability.seatsLeft} of ${availability.capacity} seats left`}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Boarding is first-come, first-served within your chosen class — no individual seat assignment.
      </p>
    </div>
  );
}

function SeatMeter({ schedule }) {
  if (!schedule) return null;
  const isLow = !schedule.isFull && schedule.seatsLeft <= LOW_SEATS_THRESHOLD;
  const pct = Math.min(100, Math.round((schedule.bookedCount / schedule.capacity) * 100));
  const barColor = schedule.isFull ? "bg-red-500" : isLow ? "bg-amber-400" : "bg-emerald-500";
  const textColor = schedule.isFull ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-900";

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-slate-500">
          <Users className="h-3.5 w-3.5" />
          Passengers logged
        </span>
        <span className={cn("font-semibold", textColor)}>
          {schedule.bookedCount} / {schedule.capacity}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      {isLow && (
        <p className="mt-1.5 text-[11px] font-medium text-amber-600">
          Only {schedule.seatsLeft} slot{schedule.seatsLeft === 1 ? "" : "s"} left on this schedule!
        </p>
      )}
      {schedule.status === "DELAYED" && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600">
          <Clock3 className="h-3 w-3" />
          Delayed +{schedule.delayMinutes} min{schedule.delayReason ? ` — ${schedule.delayReason}` : ""}
        </p>
      )}
    </div>
  );
}

export function StepTripDetails() {
  const { state, dispatch } = useWizard();
  const [ships, setShips] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    Promise.all([apiClient.get("/ships"), apiClient.get("/schedules")]).then(([shipsRes, schedulesRes]) => {
      setShips(shipsRes.data.ships);
      setSchedules(schedulesRes.data.schedules);
      setIsLoading(false);
    });
  }, []);

  function setField(field, value) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  const shipOptions = useMemo(() => ships.map((s) => ({ value: s.id, label: s.name })), [ships]);

  const filteredSchedules = useMemo(
    () => (state.shipId ? schedules.filter((s) => s.shipId === state.shipId) : schedules),
    [schedules, state.shipId]
  );

  const scheduleOptions = useMemo(
    () =>
      filteredSchedules.map((s) => ({
        value: s.id,
        label: `${s.departureTime} — ${routeLabel(s.route)}${
          s.isFull ? "  (FULL)" : `  (${s.seatsLeft} left)`
        }${s.status === "DELAYED" ? `  · Delayed +${s.delayMinutes}m` : ""}`,
        disabled: s.isFull,
      })),
    [filteredSchedules]
  );

  const selectedSchedule = useMemo(
    () => filteredSchedules.find((s) => s.id === state.scheduleId) || null,
    [filteredSchedules, state.scheduleId]
  );

  useEffect(() => {
    if (!selectedSchedule || selectedSchedule.isFull) return;
    if (selectedSchedule.seatsLeft <= LOW_SEATS_THRESHOLD) {
      showToast({
        title: "Limited capacity remaining",
        description: `Only ${selectedSchedule.seatsLeft} slot${selectedSchedule.seatsLeft === 1 ? "" : "s"} left on the ${selectedSchedule.departureTime} sailing.`,
        variant: "info",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scheduleId]);

  const canContinue =
    state.shipId && state.scheduleId && selectedSchedule && !selectedSchedule.isFull && state.accommodationClass;

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold text-slate-900">
        Trip Selection
      </h2>
      <p className="mb-8 text-center text-sm text-slate-500">
        Select the vessel and departure schedule you&apos;ll be boarding.
      </p>

      <Card className="mx-auto max-w-xl border-slate-200/80 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2">
          <div>
            <Label>Ship / Vessel</Label>
            <Select
              value={state.shipId}
              onValueChange={(v) => {
                setField("shipId", v);
                setField("scheduleId", null);
                setField("accommodationClass", null);
              }}
              options={shipOptions}
              placeholder={isLoading ? "Loading..." : "Select a ship"}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label>Departure Schedule</Label>
            <Select
              value={state.scheduleId}
              onValueChange={(v) => {
                setField("scheduleId", v);
                setField("accommodationClass", null);
              }}
              options={scheduleOptions}
              placeholder={isLoading ? "Loading..." : "Select a time slot"}
              disabled={isLoading || !state.shipId}
            />
          </div>

          {selectedSchedule && (
            <div className="sm:col-span-2">
              <SeatMeter schedule={selectedSchedule} />
              <AccommodationClassSelector
                classAvailability={selectedSchedule.classAvailability}
                value={state.accommodationClass}
                onSelect={(className) => setField("accommodationClass", className)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" size="lg" onClick={() => dispatch({ type: "PREV_STEP" })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" disabled={!canContinue} onClick={() => dispatch({ type: "NEXT_STEP" })}>
          Continue
        </Button>
      </div>
    </div>
  );
}
