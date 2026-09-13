import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ChevronLeft, ShieldCheck, Printer, Download, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { BoardingPassCard } from "./BoardingPassCard";
import { PassengerSearchBar } from "../PassengerSearchBar";
import { apiClient } from "../../lib/apiClient";
import { routeLabel } from "../../lib/route";
import { passengerTypeLabel } from "../../lib/verification";
import { ACCOMMODATION_CLASSES } from "../../lib/accommodationClass";
import { downloadBoardingPass } from "../../lib/downloadPass";
import { useToast } from "../ui/Toast";
import { cn } from "../../lib/cn";

const TRANSACTION_TYPE_OPTIONS = [
  { value: "SIGN_IN", label: "Outbound · Departing" },
  { value: "SIGN_OUT", label: "Inbound · Arriving" },
];

export function QuickRebookModal({ open, onOpenChange }) {
  const [passenger, setPassenger] = useState(null);
  const [ships, setShips] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shipId, setShipId] = useState(null);
  const [scheduleId, setScheduleId] = useState(null);
  const [accommodationClass, setAccommodationClass] = useState(null);
  const [transactionType, setTransactionType] = useState("SIGN_IN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) {
      setPassenger(null);
      setShipId(null);
      setScheduleId(null);
      setAccommodationClass(null);
      setTransactionType("SIGN_IN");
      setResult(null);
      return;
    }
    Promise.all([apiClient.get("/ships"), apiClient.get("/schedules")]).then(([shipsRes, schedulesRes]) => {
      setShips(shipsRes.data.ships);
      setSchedules(schedulesRes.data.schedules);
    });
  }, [open]);

  const filteredSchedules = useMemo(
    () => (shipId ? schedules.filter((s) => s.shipId === shipId) : schedules),
    [schedules, shipId]
  );
  const selectedSchedule = filteredSchedules.find((s) => s.id === scheduleId) || null;

  const scheduleOptions = filteredSchedules.map((s) => ({
    value: s.id,
    label: `${s.departureTime} — ${routeLabel(s.route)}${s.isFull ? "  (FULL)" : `  (${s.seatsLeft} left)`}`,
    disabled: s.isFull,
  }));

  const canConfirm = passenger && shipId && scheduleId && selectedSchedule && !selectedSchedule.isFull && accommodationClass;

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/passengers/${passenger.id}/rebook`, {
        transactionType,
        shipId,
        scheduleId,
        accommodationClass,
      });
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.code === "DUPLICATE_REGISTRATION") {
        showToast({
          title: "Duplicate Registration Detected",
          description: err.response?.data?.message,
          variant: "error",
        });
      } else {
        showToast({
          title: "Booking failed",
          description: err.response?.data?.message || "Please try again.",
          variant: "error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      await downloadBoardingPass(result);
    } catch {
      showToast({ title: "Download failed", description: "Please try again.", variant: "error" });
    } finally {
      setIsDownloading(false);
    }
  }

  function handleBookAnother() {
    setResult(null);
    setPassenger(null);
    setShipId(null);
    setScheduleId(null);
    setAccommodationClass(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 print:hidden">
          <RefreshCw className="h-5 w-5 text-graphite" />
          Quick Re-Booking
        </DialogTitle>
        <DialogDescription className="print:hidden">
          Already registered before? Find your saved profile and book a new trip in seconds — no need to
          re-enter your details.
        </DialogDescription>

        {result ? (
          <div className="mt-5">
            <BoardingPassCard
              passenger={result.passenger}
              trip={result.trip}
              ship={result.ship}
              schedule={result.schedule}
              qrCodeDataUrl={result.qrCodeDataUrl}
              passNumber={result.passNumber}
            />
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 pt-5 print:hidden">
              <Button variant="outline" size="lg" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print Pass
              </Button>
              <Button variant="outline" size="lg" onClick={handleDownload} disabled={isDownloading}>
                <Download className="h-4 w-4" />
                {isDownloading ? "Preparing..." : "Download Pass"}
              </Button>
              <Button variant="kiosk" size="lg" onClick={handleBookAnother}>
                <RotateCcw className="h-4 w-4" />
                Book Another Trip
              </Button>
            </div>
          </div>
        ) : !passenger ? (
          <div className="mt-5 print:hidden">
            <Label className="text-xs">Phone Number, Passport Number, or ID Number</Label>
            <PassengerSearchBar onSelect={setPassenger} placeholder="e.g. 0917-123-4567" />
          </div>
        ) : (
          <div className="mt-5 space-y-4 print:hidden">
            <button
              type="button"
              onClick={() => setPassenger(null)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-graphite"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Search a different passenger
            </button>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{passenger.fullName}</p>
                <p className="text-xs text-slate-500">
                  {passengerTypeLabel(passenger.passengerType)} &middot; {passenger.contactNumber || passenger.passportNumber}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
                Verified
              </span>
            </div>

            <div>
              <Label>Trip Direction</Label>
              <Select value={transactionType} onValueChange={setTransactionType} options={TRANSACTION_TYPE_OPTIONS} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Ship / Vessel</Label>
                <Select
                  value={shipId}
                  onValueChange={(v) => {
                    setShipId(v);
                    setScheduleId(null);
                    setAccommodationClass(null);
                  }}
                  options={ships.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Select ship"
                />
              </div>
              <div>
                <Label>Voyage Schedule</Label>
                <Select
                  value={scheduleId}
                  onValueChange={(v) => {
                    setScheduleId(v);
                    setAccommodationClass(null);
                  }}
                  options={scheduleOptions}
                  placeholder="Select schedule"
                  disabled={!shipId}
                />
              </div>
            </div>

            {selectedSchedule && (
              <div>
                <Label>Accommodation Class</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {ACCOMMODATION_CLASSES.map((meta) => {
                    const avail = selectedSchedule.classAvailability?.find((c) => c.className === meta.value);
                    const isFull = !!avail?.isFull;
                    const selected = accommodationClass === meta.value;
                    return (
                      <button
                        key={meta.value}
                        type="button"
                        disabled={isFull}
                        onClick={() => setAccommodationClass(meta.value)}
                        className={cn(
                          "flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <span className="text-xs font-semibold text-slate-900">{meta.label}</span>
                        <span className="text-[10px] text-slate-500">{meta.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              variant="kiosk"
              size="lg"
              className="h-auto w-full rounded-xl px-8 py-3.5"
              disabled={!canConfirm || isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? "Booking..." : "Confirm & Get My QR Pass"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
