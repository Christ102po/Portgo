import { Anchor, QrCode, ShieldCheck, UsersRound } from "lucide-react";
import { ConnectivityBadge } from "./ConnectivityBadge";
import { passengerTypeLabel } from "../lib/verification";

export function SavedRegistrationHome({ registration }) {
  const isFamily = registration.kind === "family";
  const primaryName = isFamily ? registration.headFullName : registration.passenger?.fullName;
  const passengerType = !isFamily && registration.passenger?.passengerType
    ? passengerTypeLabel(registration.passenger.passengerType)
    : null;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.24),_transparent_28%),linear-gradient(145deg,#052e24_0%,#064e3b_45%,#0b5b43_100%)] text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Anchor className="h-6 w-6 text-emerald-200" />
          </div>
          <div>
            <p className="text-lg font-black tracking-[-0.03em] sm:text-xl">PORTGO</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">Passenger Pass</p>
          </div>
        </div>
        <ConnectivityBadge />
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-78px)] w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/12 bg-white/[0.075] shadow-[0_24px_70px_-38px_rgba(0,0,0,0.75)] backdrop-blur-xl">
          <div className="p-6 text-center sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-300 text-[#063c2e] shadow-lg shadow-emerald-950/20">
              <QrCode className="h-8 w-8" />
            </div>
            <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-200">Registered PORTGO Passenger</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">{primaryName}</h1>
            {passengerType && <p className="mt-1 text-sm text-emerald-50/70">{passengerType}</p>}
            {isFamily && <p className="mt-1 text-sm text-emerald-50/70">Primary passenger · {registration.memberCount} registered travelers</p>}
          </div>

          <div className="bg-white p-6 text-slate-900 sm:p-8">
            <div className="mx-auto w-fit rounded-3xl border-2 border-slate-900 bg-white p-3 shadow-sm">
              <img src={registration.qrCodeDataUrl} alt="PORTGO passenger QR code" className="h-56 w-56 sm:h-64 sm:w-64" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{isFamily ? "Master QR Reference" : "QR Reference"}</p>
              <p className="mt-1 break-all font-mono text-base font-black tracking-wide text-slate-900">{registration.code}</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Show this QR when using PORTGO again. Port staff can scan it to open your saved passenger registration and record your current trip.</p>
            </div>

            {isFamily && registration.passengers?.length > 0 && (
              <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-900"><UsersRound className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-[0.12em]">Registered Travelers</p></div>
                <div className="mt-3 space-y-2">
                  {registration.passengers.map((passenger) => (
                    <div key={passenger.id} className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
                      <p className="text-sm font-bold text-slate-900">{passenger.fullName}</p>
                      <p className="text-[11px] text-slate-400">{passenger.role === "LEADER" ? "Primary passenger / QR holder" : "Accompanying member"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
              Your registration stays on this device after you close and reopen the installed app.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
