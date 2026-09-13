import { useState } from "react";
import { ShieldQuestion, Ban, HeartHandshake, PhoneCall, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "../ui/Dialog";

const GUIDELINES = [
  "Arrive at least 30 minutes before your scheduled departure.",
  "Bring a valid government-issued ID (Local) or passport (Tourist).",
  "Keep your digital QR pass visible and ready for gate scanning.",
  "Follow the instructions of port and vessel crew at all times.",
  "Life vests must be worn once instructed by the crew during the voyage.",
];

const PROHIBITED_ITEMS = [
  "Firearms, explosives, and other deadly weapons",
  "Flammable liquids, gas, and other combustible materials",
  "Illegal drugs and controlled substances",
  "Undeclared large cash amounts (per Anti-Money Laundering Act)",
];

const PRIORITY_LANE_RULES = [
  "Senior Citizens, PWDs, pregnant passengers, and infants may use the Priority Lane at the gate.",
  "Present supporting ID (Senior Citizen / PWD card) when requested by port staff.",
  "Medical Emergency / Ambu-Patient passengers should notify the nearest port or Coast Guard personnel immediately for expedited assistance.",
];

const HOTLINES = [
  { label: "Philippine Coast Guard Hotline", number: "0900-000-0000" },
  { label: "Port Police / Security", number: "0900-000-0001" },
  { label: "Port Medical / Emergency Clinic", number: "0900-000-0002" },
];

function Section({ icon: Icon, title, items, accent }) {
  return (
    <div>
      <p className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${accent}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PortGuidelinesModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-card transition-all hover:-translate-y-0.5 hover:text-graphite hover:shadow-lg print:hidden"
        >
          <ShieldQuestion className="h-4 w-4 text-graphite" />
          Port Guidelines &amp; Safety Rules
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <ShieldQuestion className="h-5 w-5 text-graphite" />
          Port Guidelines &amp; Safety Rules
        </DialogTitle>
        <DialogDescription>
          Please review these Philippine Ports Authority passenger reminders before boarding.
        </DialogDescription>

        <div className="mt-5 space-y-5">
          <Section icon={ShieldQuestion} title="Passenger Reminders" items={GUIDELINES} accent="text-graphite" />
          <Section icon={Ban} title="Prohibited Items" items={PROHIBITED_ITEMS} accent="text-red-600" />
          <Section
            icon={HeartHandshake}
            title="Priority Lane & Assistance"
            items={PRIORITY_LANE_RULES}
            accent="text-emerald-600"
          />

          <div className="rounded-2xl border border-slate-200 bg-surface p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <PhoneCall className="h-3.5 w-3.5" />
              Emergency Hotlines
            </p>
            <div className="space-y-1.5">
              {HOTLINES.map((h) => (
                <div key={h.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{h.label}</span>
                  <span className="font-mono font-semibold text-graphite">{h.number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
