import { ArrowUpRight, ArrowDownLeft, ChevronLeft, CheckCircle2 } from "lucide-react";
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
    },
    {
      value: "SIGN_OUT",
      title: t("signOut"),
      description: t("signOutDescription", portVars),
      icon: ArrowDownLeft,
    },
  ];

  function select(value) {
    dispatch({ type: "SET_FIELD", field: "transactionType", value });
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-bold tracking-tight text-slate-900">
        {t("transactionQuestion")}
      </h2>
      <p className="mb-6 text-center text-sm text-slate-500">
        {t("transactionSubtitle", portVars)}
      </p>

      <div className="grid grid-cols-2 gap-4 my-6">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = state.transactionType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className={cn(
                "group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border-2 border-slate-200/80 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg",
                selected &&
                  "border-emerald-500 bg-emerald-50/40 shadow-md shadow-emerald-500/10 ring-4 ring-emerald-500/20"
              )}
            >
              <div
                className={cn(
                  "mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all duration-300",
                  selected
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : "bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-500"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{opt.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{opt.description}</p>
              </div>
              {selected && (
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("selected")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" size="lg" onClick={() => dispatch({ type: "PREV_STEP" })}>
          <ChevronLeft className="h-4 w-4" /> {t("back")}
        </Button>
        <Button
          variant="kiosk"
          size="lg"
          className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl"
          disabled={!state.transactionType}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          {t("continue")}
        </Button>
      </div>
    </div>
  );
}
