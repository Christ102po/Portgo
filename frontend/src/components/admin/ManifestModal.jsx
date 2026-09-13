import { useEffect, useState } from "react";
import { FileText, Printer, Download, Car, ShieldCheck, PenTool, IdCard } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { PcgSignOffDialog } from "./PcgSignOffDialog";
import { PriorityTags } from "../PriorityTags";
import { apiClient, downloadWithAuth } from "../../lib/apiClient";
import { routeLabel } from "../../lib/route";
import { passengerStatusBadge, transactionBadge } from "../../lib/tripStatus";
import { priorityFlags } from "../../lib/priority";
import { verificationBadge, passengerTypeLabel } from "../../lib/verification";
import { accommodationClassLabel } from "../../lib/accommodationClass";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../ui/Toast";

const SIGNOFF_ROLES = ["SUPER_ADMIN", "ADMIN", "GATE_SCANNER"];

const VEHICLE_TYPE_LABEL = {
  MOTORCYCLE: "Motorcycle",
  SEDAN_SUV: "Sedan / SUV",
  TRUCK_CARGO: "Truck / Cargo",
};

export function ManifestModal({ open, onOpenChange, scheduleId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const { showToast } = useToast();
  const { admin } = useAuth();
  const canSignOff = SIGNOFF_ROLES.includes(admin?.role);

  useEffect(() => {
    if (!open || !scheduleId) return;
    setIsLoading(true);
    setData(null);
    apiClient
      .get(`/schedules/${scheduleId}/manifest`)
      .then((res) => setData(res.data))
      .finally(() => setIsLoading(false));
  }, [open, scheduleId]);

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadWithAuth(
        `/schedules/${scheduleId}/manifest/export`,
        `pcg-manifest-${scheduleId}.pdf`
      );
    } catch (err) {
      showToast({ title: "Export failed", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogTitle className="flex items-center gap-2 print:hidden">
          <FileText className="h-5 w-5 text-graphite" />
          Official Coast Guard Passenger Manifest
        </DialogTitle>
        <DialogDescription className="print:hidden">
          Certified list of passengers booked on this sailing, formatted for PCG submission.
        </DialogDescription>

        {isLoading && <p className="mt-6 text-center text-sm text-slate-400">Loading manifest...</p>}

        {!isLoading && data && (
          <div className="mt-5" id="manifest-content">
            <div className="rounded-2xl bg-graphite p-5 text-white print:rounded-none print:border-2 print:border-black print:bg-white print:text-black">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-widest text-mint print:text-black">PORTGO</p>
                  <p className="mt-1 text-sm text-white/70 print:text-black">
                    {data.ports.origin} &rarr; {data.ports.destination} ({routeLabel(data.schedule.route)})
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                  <span className="text-white/50 print:text-black/60">Ship / Vessel</span>
                  <span className="text-right font-semibold">{data.ship.name}</span>
                  <span className="text-white/50 print:text-black/60">Voyage No.</span>
                  <span className="text-right font-semibold">{data.schedule.voyageNumber || "N/A"}</span>
                  <span className="text-white/50 print:text-black/60">Departure</span>
                  <span className="text-right font-semibold">{data.schedule.departureTime}</span>
                  <span className="text-white/50 print:text-black/60">Boarded / Booked / Capacity</span>
                  <span className="text-right font-semibold">
                    {data.boardedCount} / {data.totalBooked} / {data.capacity}
                  </span>
                  <span className="text-white/50 print:text-black/60">Vehicles / Cargo</span>
                  <span className="text-right font-semibold">{data.vehicleTrips.length}</span>
                </div>
              </div>
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Passenger List
            </p>
            <div className="max-h-[40vh] overflow-auto rounded-xl border border-slate-200 print:max-h-none print:overflow-visible print:border-black">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="sticky top-0 bg-surface print:static">
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400 print:text-black">
                    <th className="px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Full Name</th>
                    <th className="px-3 py-2 font-semibold">Age</th>
                    <th className="px-3 py-2 font-semibold">Gender</th>
                    <th className="px-3 py-2 font-semibold">Category</th>
                    <th className="px-3 py-2 font-semibold">Direction</th>
                    <th className="px-3 py-2 font-semibold">Class</th>
                    <th className="px-3 py-2 font-semibold">Verification</th>
                    <th className="px-3 py-2 font-semibold">Document</th>
                    <th className="px-3 py-2 font-semibold">Priority</th>
                    <th className="px-3 py-2 font-semibold">Group</th>
                    <th className="px-3 py-2 font-semibold">Emergency Contact</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trips.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-3 py-8 text-center text-slate-400">
                        No passengers booked on this sailing.
                      </td>
                    </tr>
                  )}
                  {data.trips.map((trip, idx) => {
                    const badge = passengerStatusBadge(trip.status);
                    const verification = verificationBadge(trip.passenger);
                    const flags = priorityFlags(trip.passenger);
                    const groupLabel = trip.familyBooking ? `FAM-${trip.familyBooking.masterCode.slice(-5)}` : "—";
                    const txnBadge = transactionBadge(trip.transactionType);
                    return (
                      <tr key={trip.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-ink">{trip.passenger.fullName}</td>
                        <td className="px-3 py-2 text-ink">{trip.passenger.age ?? "—"}</td>
                        <td className="px-3 py-2 text-ink">{trip.passenger.gender}</td>
                        <td className="px-3 py-2 text-ink">{passengerTypeLabel(trip.passenger.passengerType)}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={txnBadge.variant}
                            className="print:border print:border-black print:bg-white print:text-black"
                          >
                            {txnBadge.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-ink">
                          {trip.accommodationClass ? accommodationClassLabel(trip.accommodationClass) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={verification.variant}
                            className="print:border print:border-black print:bg-white print:text-black"
                          >
                            {verification.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 print:hidden">
                          {trip.passenger.verificationDocumentUrl ? (
                            <a
                              href={trip.passenger.verificationDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                              title="View uploaded ID document"
                            >
                              <IdCard className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {flags.length > 0 ? <PriorityTags flags={flags} /> : "—"}
                        </td>
                        <td className="px-3 py-2 text-ink">{groupLabel}</td>
                        <td className="px-3 py-2 text-ink">
                          {trip.passenger.emergencyContactName
                            ? `${trip.passenger.emergencyContactName}${trip.passenger.emergencyContactPhone ? ` (${trip.passenger.emergencyContactPhone})` : ""}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={badge.variant} className="print:border print:border-black print:bg-white print:text-black">
                            {badge.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.vehicleTrips.length > 0 && (
              <>
                <p className="mb-2 mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Car className="h-3.5 w-3.5" />
                  Vehicle / Cargo Manifest
                </p>
                <div className="overflow-auto rounded-xl border border-slate-200 print:border-black">
                  <table className="w-full min-w-[600px] text-left text-xs">
                    <thead className="bg-surface print:static">
                      <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400 print:text-black">
                        <th className="px-3 py-2 font-semibold">#</th>
                        <th className="px-3 py-2 font-semibold">Plate Number</th>
                        <th className="px-3 py-2 font-semibold">Vehicle Type</th>
                        <th className="px-3 py-2 font-semibold">Driver / Passenger</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vehicleTrips.map((trip, idx) => (
                        <tr key={trip.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-medium text-ink">{trip.plateNumber || "—"}</td>
                          <td className="px-3 py-2 text-ink">
                            {VEHICLE_TYPE_LABEL[trip.vehicleType] || trip.vehicleType}
                          </td>
                          <td className="px-3 py-2 text-ink">{trip.passenger.fullName}</td>
                          <td className="px-3 py-2">
                            <Badge variant={passengerStatusBadge(trip.status).variant}>
                              {passengerStatusBadge(trip.status).label}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <p className="mt-3 text-[10px] text-slate-400 print:mt-8 print:text-black">
              Certified true and correct list of passengers aboard. For Philippine Coast Guard (PCG) submission.
            </p>

            {data.signOff && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 print:hidden">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs font-medium text-emerald-800">
                  Certified by <span className="font-semibold">{data.signOff.officerName}</span> (Badge #
                  {data.signOff.badgeNumber}) on {new Date(data.signOff.signedAt).toLocaleString()}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-3 print:hidden">
              {canSignOff && (
                <Button variant="outline" onClick={() => setSignOffOpen(true)}>
                  <PenTool className="h-4 w-4" />
                  {data.signOff ? "Re-Sign Manifest" : "PCG Inspection Sign-Off"}
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print Manifest
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                <Download className="h-4 w-4" />
                {isExporting ? "Generating..." : "Generate PCG Official Departure Clearance"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <PcgSignOffDialog
        open={signOffOpen}
        onOpenChange={setSignOffOpen}
        scheduleId={scheduleId}
        onSigned={(signOff) => setData((prev) => ({ ...prev, signOff }))}
      />
    </Dialog>
  );
}
