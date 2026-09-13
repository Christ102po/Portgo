import { useState } from "react";
import { QrCode, Inbox, PhoneCall, Contact } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { passengerTypeLabel, isPassengerVerified } from "../../lib/verification";
import { accommodationClassLabel } from "../../lib/accommodationClass";
import { transactionBadge } from "../../lib/tripStatus";
import { routeLabel } from "../../lib/route";

function formatTimestamp(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ trip }) {
  if (trip.status === "BOARDED") return <Badge variant="active">Boarded</Badge>;
  if (trip.status === "CANCELLED") return <Badge variant="danger">Cancelled</Badge>;
  if (trip.status === "NO_SHOW") return <Badge variant="warning">No-Show</Badge>;
  if (trip.status === "REBOOKED") return <Badge variant="neutral">Rebooked</Badge>;
  return isPassengerVerified(trip.passenger) ? (
    <Badge variant="active">Verified</Badge>
  ) : (
    <Badge variant="neutral">Checked In</Badge>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-3 py-3.5">
          <Skeleton className="h-4 w-full max-w-[100px]" />
        </td>
      ))}
    </tr>
  );
}

export function ManifestInspectionTable({ rows, total = 0, isLoading }) {
  const [qrTrip, setQrTrip] = useState(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 print:hidden">
        <h2 className="text-sm font-bold text-slate-900">Passenger Manifest Log</h2>
        <p className="text-xs text-slate-400">
          {total} passenger{total === 1 ? "" : "s"} matching current filters
        </p>
      </div>
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="px-3 py-3.5">Status</th>
              <th className="px-3 py-3.5">Ticket / Gate Pass #</th>
              <th className="px-3 py-3.5">Passenger</th>
              <th className="px-3 py-3.5">Age / Gender</th>
              <th className="px-3 py-3.5">Type</th>
              <th className="px-3 py-3.5">Vessel &amp; Voyage</th>
              <th className="px-3 py-3.5">Class</th>
              <th className="px-3 py-3.5">Contact / Emergency</th>
              <th className="px-3 py-3.5 text-right">Registered</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <Inbox className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No Passengers Logged</p>
                    <p className="text-xs text-slate-400">
                      No manifest entries match the current filters for this inspection.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((r) => {
                const txnBadge = transactionBadge(r.transactionType);
                return (
                  <tr key={r.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3.5">
                      <StatusBadge trip={r} />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900">{r.passNumber}</span>
                        {r.qrCodeData && (
                          <button
                            type="button"
                            onClick={() => setQrTrip(r)}
                            className="text-blue-500 transition-colors hover:text-blue-700"
                            title="Preview QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <Badge variant={txnBadge.variant} className="mt-1">
                        {txnBadge.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="font-semibold text-slate-800">{r.passenger.fullName}</p>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">
                      {r.passenger.age ?? "—"} / {r.passenger.gender ? r.passenger.gender[0] : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-slate-700">{passengerTypeLabel(r.passenger.passengerType)}</td>
                    <td className="px-3 py-3.5">
                      <p className="font-medium text-slate-800">{r.ship.name}</p>
                      <p className="text-xs text-slate-400">
                        {r.schedule?.departureTime || "—"} &middot; {r.schedule ? routeLabel(r.schedule.route) : "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-slate-700">
                      {r.accommodationClass ? accommodationClassLabel(r.accommodationClass) : "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="flex items-center gap-1 text-xs text-slate-700">
                        <PhoneCall className="h-3 w-3 text-slate-400" />
                        {r.passenger.contactNumber || r.passenger.passportNumber || "—"}
                      </p>
                      {r.passenger.emergencyContactName && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <Contact className="h-3 w-3" />
                          {r.passenger.emergencyContactName}
                          {r.passenger.emergencyContactPhone ? ` (${r.passenger.emergencyContactPhone})` : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs text-slate-500">{formatTimestamp(r.createdAt)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!qrTrip} onOpenChange={(open) => !open && setQrTrip(null)}>
        <DialogContent className="max-w-xs text-center">
          <DialogTitle>Boarding Pass QR</DialogTitle>
          <DialogDescription>
            {qrTrip?.passenger.fullName} &middot; {qrTrip?.passNumber}
          </DialogDescription>
          {qrTrip?.qrCodeData && (
            <img
              src={qrTrip.qrCodeData}
              alt={`QR code for pass ${qrTrip.passNumber}`}
              className="mx-auto mt-4 h-48 w-48 rounded-xl border border-slate-200 p-2"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
