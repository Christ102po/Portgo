import { ArrowUpRight, ArrowDownLeft, ChevronLeft, Check } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { useLanguage } from "../../hooks/useLanguage";
import { cn } from "../../lib/cn";
import { PORT_NAME, PORT_DESTINATIONS } from "../../lib/route";
import { Button } from "../ui/Button";

export function StepTransactionType() {
  const { state, dispatch } = useWizard();
  const { t } = useLanguage();

  const portVars = { port: PORT_NAME, destination: PORT_DESTINATIONS };

  // SIGN_IN = outbound / departing (leaving this port); SIGN_OUT = inbound /
  // arriving (reaching this port). Enum names are historical — the wording here
  // is what passengers actually read.
  const OPTIONS = [
    {
      value: "SIGN_IN",
      title: t("signIn"),
      description: t("signInDescription", portVars),
      icon: ArrowUpRight,
      eyebrow: "Departure",
    },
    {
      value: "SIGN_OUT",
      title: t("signOut"),
      description: t("signOutDescription", portVars),
      icon: ArrowDownLeft,
      eyebrow: "Arrival",
    },
  ];

  function select(value) {
    dispatch({ type: "SET_FIELD", field: "transactionType", value });
  }

  return (
    <div>
      <h2 className="section-title">{t("transactionQuestion")}</h2>
      <p className="section-subtitle mb-5">{t("transactionSubtitle", portVars)}</p>

      <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = state.transactionType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              aria-pressed={selected}
              className={cn(
                "group relative min-h-[142px] overflow-hidden rounded-[26px] border p-5 text-left transition-all duration-200 active:scale-[0.985] sm:min-h-[205px] sm:p-6",
                selected
                  ? "border-emerald-400 bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-[0_22px_45px_-24px_rgba(5,150,105,0.95)] ring-4 ring-emerald-200/60"
                  : "border-emerald-100 bg-white text-slate-900 shadow-[0_14px_34px_-26px_rgba(6,78,59,0.6)] hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 sm:h-14 sm:w-14",
                    selected
                      ? "bg-white/18 text-white ring-1 ring-white/30"
                      : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"
                  )}
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                {selected && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-700 shadow-md" aria-label="Selected">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>

              <div className="mt-5">
                <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.18em]", selected ? "text-emerald-100" : "text-emerald-600")}>{opt.eyebrow}</p>
                <p className={cn("mt-1 text-xl font-black tracking-[-0.02em]", selected ? "text-white" : "text-slate-950")}>{opt.title}</p>
                <p className={cn("mt-1.5 text-sm leading-5", selected ? "text-emerald-50/90" : "text-slate-500")}>{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mobile-action-bar">
        <Button variant="outline" size="lg" onClick={() => dispatch({ type: "PREV_STEP" })}>
          <ChevronLeft className="h-4 w-4" /> {t("back")}
        </Button>
        <Button
          variant="kiosk"
          size="lg"
          className="h-auto w-full rounded-2xl px-8 py-3.5 sm:w-auto"
          disabled={!state.transactionType}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          {t("continue")}
        </Button>
      </div>
    </div>
  );
}
