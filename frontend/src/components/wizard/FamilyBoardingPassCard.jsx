import { Ship as ShipIcon, Clock, MapPin, Users } from "lucide-react";
import { routeLabel } from "../../lib/route";
import { accommodationClassLabel } from "../../lib/accommodationClass";

export function FamilyBoardingPassCard({ familyBooking, trips, ship, schedule, qrCodeDataUrl, masterCode }) {
  const accommodationClass = trips?.[0]?.accommodationClass;

  return (
    <div
      id="boarding-pass"
      className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-card print:w-[80mm] print:max-w-[80mm] print:rounded-none print:border-2 print:border-black print:shadow-none"
    >
      <div className="bg-graphite p-6 print:border-b-2 print:border-black print:bg-white print:p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-mint print:text-black">
              PORTGO FAMILY BOARDING PASS
            </p>
            <p className="mt-0.5 text-lg font-bold text-white print:text-base print:text-black">
              {familyBooking.headFullName} &amp; Family
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-mint/20 px-2.5 py-1 text-[11px] font-semibold text-mint print:border print:border-black print:bg-white print:text-black">
            <Users className="h-3.5 w-3.5" />
            {familyBooking.memberCount} travelers
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 print:mt-3 print:gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 print:text-black/60">
              Ship / Vessel
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white print:text-black">{ship.name}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 print:text-black/60">
              Route
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white print:text-black">{routeLabel(schedule.route)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 print:text-black/60">
              Departure
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white print:text-black">{schedule.departureTime}</p>
          </div>
          {accommodationClass && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 print:text-black/60">
                Class
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white print:text-black">
                {accommodationClassLabel(accommodationClass)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex items-center bg-white print:hidden">
        <div className="absolute -left-3 h-6 w-6 rounded-full bg-surface" />
        <div className="w-full border-t border-dashed border-slate-300" />
        <div className="absolute -right-3 h-6 w-6 rounded-full bg-surface" />
      </div>

      <div className="flex flex-col items-center gap-4 p-6 print:gap-2 print:p-3">
        <img
          src={qrCodeDataUrl}
          alt="Family master QR code"
          className="h-44 w-44 rounded-xl border border-slate-100 print:h-28 print:w-28 print:rounded-none print:border print:border-black"
        />
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 print:text-black">
            Master Code — Scan once to board the whole family
          </p>
          <p className="font-mono text-base font-bold tracking-widest text-graphite print:text-black">
            {masterCode}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 print:gap-1.5 print:border-black print:pt-2">
          <div className="flex items-center gap-1.5 print:text-black">
            <ShipIcon className="h-3.5 w-3.5 text-graphite print:text-black" />
            {ship.name}
          </div>
          <div className="flex items-center gap-1.5 print:text-black">
            <Clock className="h-3.5 w-3.5 text-graphite print:text-black" />
            {schedule.departureTime}
          </div>
          <div className="col-span-2 flex items-center gap-1.5 print:text-black">
            <MapPin className="h-3.5 w-3.5 text-graphite print:text-black" />
            {routeLabel(schedule.route)}
          </div>
        </div>

        <div className="w-full rounded-xl border border-slate-100 bg-surface p-3 print:border-black print:bg-white">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 print:text-black">
            Family Members
          </p>
          <div className="space-y-1.5">
            {trips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between text-xs print:text-black">
                <span className="font-medium text-ink print:text-black">
                  {trip.passenger.fullName}
                  {trip.passenger.age != null ? ` (${trip.passenger.age})` : ""}
                </span>
                <span className="text-slate-500 print:text-black">{trip.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
