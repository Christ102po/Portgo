import { useEffect, useMemo, useState } from "react";
import { ShieldQuestion, Ban, HeartHandshake, PhoneCall, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "../ui/Dialog";
import { apiClient } from "../../lib/apiClient";

const SECTION_META = {
  PASSENGER_REMINDERS: {
    title: "Passenger Reminders",
    icon: ShieldQuestion,
    accent: "text-graphite",
  },
  PROHIBITED_ITEMS: {
    title: "Prohibited Items",
    icon: Ban,
    accent: "text-red-600",
  },
  PRIORITY_ASSISTANCE: {
    title: "Priority Lane & Assistance",
    icon: HeartHandshake,
    accent: "text-emerald-600",
  },
};

function Section({ icon: Icon, title, items, accent }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${accent}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm text-slate-600">
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
            <span className="whitespace-pre-wrap">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PortGuidelinesModal() {
  const [open, setOpen] = useState(false);
  const [guidelines, setGuidelines] = useState([]);
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || loaded || loading) return;
    setLoading(true);
    setError("");
    apiClient
      .get("/port-information/public")
      .then((res) => {
        setGuidelines(res.data.guidelines || []);
        setHotlines(res.data.hotlines || []);
        setLoaded(true);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Unable to load the latest port guidelines.");
      })
      .finally(() => setLoading(false));
  }, [open, loaded, loading]);

  const grouped = useMemo(() => {
    const map = {
      PASSENGER_REMINDERS: [],
      PROHIBITED_ITEMS: [],
      PRIORITY_ASSISTANCE: [],
    };
    guidelines.forEach((item) => {
      if (!map[item.section]) map[item.section] = [];
      map[item.section].push(item);
    });
    return map;
  }, [guidelines]);

  const hasContent = guidelines.length > 0 || hotlines.length > 0;

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
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <ShieldQuestion className="h-5 w-5 text-graphite" />
          Port Guidelines &amp; Safety Rules
        </DialogTitle>
        <DialogDescription>
          Review the latest safety information published by the PORTGO administrator before boarding.
        </DialogDescription>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading latest port information...
          </div>
        )}

        {!loading && error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && !hasContent && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No port guidelines or emergency hotlines have been published yet.
          </div>
        )}

        {!loading && !error && hasContent && (
          <div className="mt-5 space-y-5">
            {Object.entries(SECTION_META).map(([section, meta]) => (
              <Section
                key={section}
                icon={meta.icon}
                title={meta.title}
                items={grouped[section] || []}
                accent={meta.accent}
              />
            ))}

            {hotlines.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-surface p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <PhoneCall className="h-3.5 w-3.5" />
                  Emergency Hotlines
                </p>
                <div className="space-y-2">
                  {hotlines.map((hotline) => (
                    <a
                      key={hotline.id}
                      href={`tel:${String(hotline.number).replace(/[^+\d]/g, "")}`}
                      className="flex items-center justify-between gap-4 rounded-xl px-2 py-1.5 text-sm transition hover:bg-white"
                    >
                      <span className="text-slate-600">{hotline.label}</span>
                      <span className="shrink-0 font-mono font-semibold text-graphite">{hotline.number}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
