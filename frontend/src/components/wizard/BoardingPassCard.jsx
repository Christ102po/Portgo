import { Ship as ShipIcon, Clock, MapPin, BadgeCheck } from "lucide-react";
import { Badge } from "../ui/Badge";
import { PriorityTags } from "../PriorityTags";
import { routeLabel } from "../../lib/route";
import { passengerStatusBadge } from "../../lib/tripStatus";
import { priorityFlags } from "../../lib/priority";
import { passengerTypeLabel } from "../../lib/verification";
import { accommodationClassLabel } from "../../lib/accommodationClass";

function BoardingPassField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 print:text-black/60">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-white print:text-black">{value}</p>
    </div>
  );
}

export function BoardingPassCard({ passenger, trip, ship, schedule, qrCodeDataUrl, passNumber }) {
  const statusBadge = passengerStatusBadge(trip.status);
  const flags = priorityFlags(passenger);
  const isTourist = passenger.passengerType === "FOREIGN_TOURIST";

  return (
    <div
      id="boarding-pass"
      className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-card sm:flex-row print:block print:w-[80mm] print:max-w-[80mm] print:rounded-none print:border-2 print:border-black print:shadow-none"
    >
      <div className="flex-1 bg-graphite p-6 print:border-b-2 print:border-black print:bg-white print:p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-mint print:text-black">
              PORTGO PASSENGER CONFIRMATION
            </p>
            <p className="mt-0.5 text-lg font-bold text-white print:text-base print:text-black">
              {passenger.fullName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="active" className="print:border print:border-black print:bg-white print:text-black">
              {trip.transactionType === "SIGN_IN" ? "Outbound · Departing" : "Inbound · Arriving"}
            </Badge>
            <Badge
              variant={statusBadge.variant}
              className="print:border print:border-black print:bg-white print:text-black"
            >
              {statusBadge.label}
            </Badge>
          </div>
        </div>

        {isTourist && (passenger.isPassportVerified || passenger.isFaceVerified) && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-mint/20 px-2.5 py-1.5 print:border print:border-black print:bg-white">
            <BadgeCheck className="h-3.5 w-3.5 text-mint print:text-black" />
            <span className="text-[11px] font-semibold text-mint print:text-black">
              {passenger.isPassportVerified && passenger.isFaceVerified
                ? "Passport & Face Verified"
                : passenger.isPassportVerified
                ? "Passport Verified"
                : "Face Verified"}
            </span>
          </div>
        )}

        {!isTourist && passenger.isDocumentVerified && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-mint/20 px-2.5 py-1.5 print:border print:border-black print:bg-white">
            <BadgeCheck className="h-3.5 w-3.5 text-mint print:text-black" />
            <span className="text-[11px] font-semibold text-mint print:text-black">ID Document Verified</span>
          </div>
        )}

        {flags.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-400/20 px-2.5 py-1.5 print:border print:border-black print:bg-white">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200 print:text-black">
              Priority Assistance
            </p>
            <PriorityTags flags={flags} />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 print:mt-3 print:gap-2">
          <BoardingPassField label="Ship / Vessel" value={ship.name} />
          <BoardingPassField label="Route" value={routeLabel(schedule.route)} />
          <BoardingPassField label="Departure" value={schedule.departureTime} />
          <BoardingPassField label="Passenger Type" value={passengerTypeLabel(passenger.passengerType)} />
          {trip.accommodationClass && (
            <BoardingPassField label="Class" value={accommodationClassLabel(trip.accommodationClass)} />
          )}
          {isTourist && passenger.nationality && (
            <BoardingPassField label="Nationality" value={passenger.nationality} />
          )}
          {isTourist && passenger.passportNumber && (
            <BoardingPassField label="Passport No." value={passenger.passportNumber} />
          )}
        </div>

      </div>

      {/* Perforation: vertical between side-by-side panels on screen, horizontal when stacked on narrow/print layouts. */}
      <div className="relative hidden bg-white sm:flex sm:w-0 sm:flex-col sm:items-center print:hidden">
        <div className="absolute -top-3 h-6 w-6 rounded-full bg-surface" />
        <div className="h-full border-l border-dashed border-slate-300" />
        <div className="absolute -bottom-3 h-6 w-6 rounded-full bg-surface" />
      </div>
      <div className="relative flex items-center bg-white sm:hidden print:hidden">
        <div className="absolute -left-3 h-6 w-6 rounded-full bg-surface" />
        <div className="w-full border-t border-dashed border-slate-300" />
        <div className="absolute -right-3 h-6 w-6 rounded-full bg-surface" />
      </div>

      <div className="flex flex-col items-center justify-center gap-3 p-6 sm:w-72 sm:shrink-0 print:gap-2 print:p-3 print:w-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 print:hidden">
          Scan at Gate
        </p>
        <div className="rounded-2xl border-2 border-graphite bg-white p-2.5 shadow-sm print:rounded-none print:border-2 print:border-black print:p-1.5">
          <img
            src={qrCodeDataUrl}
            alt="Boarding QR code"
            className="h-40 w-40 print:h-28 print:w-28"
          />
        </div>
        <div className="w-full text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 print:text-black">
            Reference ID
          </p>
          <p className="mt-0.5 break-all font-mono text-base font-bold tracking-wide text-graphite print:text-black">
            {passNumber}
          </p>
        </div>

        {/* Stacked (not 2-up) so vessel names / times never crowd or clip in this narrow column. */}
        <div className="w-full space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600 print:border-black print:pt-2">
          <div className="flex items-center gap-1.5 print:text-black">
            <ShipIcon className="h-3.5 w-3.5 shrink-0 text-graphite print:text-black" />
            <span className="truncate">{ship.name}</span>
          </div>
          <div className="flex items-center gap-1.5 print:text-black">
            <Clock className="h-3.5 w-3.5 shrink-0 text-graphite print:text-black" />
            <span className="truncate">{schedule.departureTime}</span>
          </div>
          <div className="flex items-center gap-1.5 print:text-black">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-graphite print:text-black" />
            <span className="truncate">{routeLabel(schedule.route)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
