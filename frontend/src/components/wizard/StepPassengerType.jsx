import { useState } from "react";
import { Home, Plane, UserRound, UsersRound, CheckCircle2, Siren, MapPinned, Globe2 } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { useLanguage } from "../../hooks/useLanguage";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";

const OPTIONS = [
  { value: "LOCAL_RESIDENT", key: "localResident", icon: Home },
  { value: "TOURIST", key: "touristCategory", icon: Plane },
];

const TOURIST_SUB_OPTIONS = [
  { value: "LOCAL_TOURIST", key: "localTourist", icon: MapPinned },
  { value: "FOREIGN_TOURIST", key: "foreignTourist", icon: Globe2 },
];

export function StepPassengerType() {
  const { state, dispatch } = useWizard();
  const { t } = useLanguage();
  const isTouristType = state.passengerType === "LOCAL_TOURIST" || state.passengerType === "FOREIGN_TOURIST";
  const [touristExpanded, setTouristExpanded] = useState(isTouristType);

  const MODE_OPTIONS = [
    { value: "INDIVIDUAL", label: t("registerMyself"), icon: UserRound },
    { value: "GROUP", label: t("registerGroup"), icon: UsersRound },
  ];

  function select(value) {
    dispatch({ type: "SET_FIELD", field: "passengerType", value });
  }

  function selectMode(value) {
    dispatch({ type: "SET_FIELD", field: "registrationMode", value });
  }

  function selectCard(value) {
    if (value === "TOURIST") {
      setTouristExpanded(true);
      if (!isTouristType) select(null);
    } else {
      setTouristExpanded(false);
      select(value);
    }
  }

  return (
    <div>
      <div className="mx-auto mb-5 inline-flex w-full max-w-sm rounded-full border border-slate-200 bg-slate-100 p-1">
        {MODE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = (state.registrationMode || "INDIVIDUAL") === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectMode(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-300",
                selected
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <h2 className="mb-1 text-center text-xl font-bold tracking-tight text-slate-900">
        {t("passengerTypeQuestion")}
      </h2>
      <p className="mb-6 text-center text-sm text-slate-500">
        {state.registrationMode === "GROUP"
          ? t("passengerTypeSubtitleGroup")
          : t("passengerTypeSubtitleIndividual")}
      </p>

      <div className="grid grid-cols-2 gap-4 my-6">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = opt.value === "TOURIST" ? isTouristType || touristExpanded : state.passengerType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectCard(opt.value)}
              className={cn(
                "group relative rounded-2xl p-[2px] text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]",
                selected
                  ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25"
                  : "bg-gradient-to-br from-slate-200 to-slate-100 shadow-sm hover:from-emerald-300 hover:to-teal-300 hover:shadow-lg hover:shadow-emerald-500/10"
              )}
            >
              <div
                className={cn(
                  "flex h-full flex-col items-start gap-3 rounded-[14px] bg-white p-6 transition-colors duration-300",
                  selected && "bg-emerald-50/50"
                )}
              >
                <div
                  className={cn(
                    "mb-2 flex h-16 w-16 items-center justify-center rounded-2xl text-xl transition-all duration-300",
                    selected
                      ? "scale-105 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30"
                      : "bg-slate-100 text-slate-600 group-hover:scale-105 group-hover:bg-emerald-50 group-hover:text-emerald-500"
                  )}
                >
                  <Icon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{t(opt.key)}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{t(`${opt.key}Description`)}</p>
                </div>
              </div>
              {selected && (
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-white">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {touristExpanded && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-center text-sm font-semibold text-slate-700">
            Are you a Philippine Tourist (Domestic) or a Foreign Tourist?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TOURIST_SUB_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = state.passengerType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => select(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 bg-white px-3 py-3 text-center transition-colors",
                    selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Icon className={cn("h-5 w-5", selected ? "text-emerald-600" : "text-slate-400")} />
                  <span className="text-xs font-bold text-slate-900">{t(opt.key)}</span>
                  <span className="text-[11px] text-slate-500">{t(`${opt.key}Description`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          dispatch({ type: "SET_FIELD", field: "isMedicalEmergency", value: !state.isMedicalEmergency })
        }
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-center text-sm font-bold transition-all",
          state.isMedicalEmergency
            ? "border-red-500 bg-red-50 text-red-700 shadow-md shadow-red-500/10"
            : "border-red-200 bg-white text-red-600 hover:border-red-400 hover:bg-red-50/50"
        )}
      >
        <Siren className={cn("h-5 w-5 shrink-0", !state.isMedicalEmergency && "animate-pulse")} />
        {state.isMedicalEmergency
          ? "Medical Emergency Flagged"
          : "Medical Emergency / Ambu-Patient — Tap for Immediate Assistance"}
      </button>

      {state.isMedicalEmergency && (
        <div className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-bold">
            Please proceed directly to the nearest Port or Coast Guard personnel for immediate assistance.
          </p>
          <p className="mt-1 text-xs text-red-600">You may continue this registration below if you are able to.</p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          variant="kiosk"
          size="lg"
          className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl"
          disabled={!state.passengerType}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          {t("continue")}
        </Button>
      </div>
    </div>
  );
}
