import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

const LOCAL_LABELS = ["Passenger", "Direction", "Verify", "Details", "Trip", "Confirm"];
const TOURIST_LABELS = ["Passenger", "Direction", "Selfie", "Details", "Trip", "Confirm"];
const GROUP_LABELS = ["Group", "Transaction", "Members", "Trip", "Confirm"];

export function StepIndicator({ currentStep, passengerType, totalSteps = 6, isGroupMode = false }) {
  const labels = isGroupMode ? GROUP_LABELS : passengerType === "FOREIGN_TOURIST" ? TOURIST_LABELS : LOCAL_LABELS;
  const visibleLabels = labels.slice(0, totalSteps);
  const progressPct = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-2 flex items-center justify-between sm:hidden">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-600">Step {currentStep} of {totalSteps}</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">{visibleLabels[currentStep - 1]}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{Math.round(((currentStep) / totalSteps) * 100)}%</span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-4 hidden items-start justify-between sm:flex">
        {visibleLabels.map((label, idx) => {
          const step = idx + 1;
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-2 px-1">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-extrabold transition-all",
                  isComplete && "border-emerald-500 bg-emerald-500 text-white",
                  isActive && "border-emerald-500 bg-white text-emerald-700 ring-4 ring-emerald-500/10",
                  !isComplete && !isActive && "border-slate-200 bg-slate-50 text-slate-400"
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : step}
              </span>
              <span className={cn("text-center text-[10px] font-bold uppercase tracking-wide", isActive ? "text-slate-900" : isComplete ? "text-slate-500" : "text-slate-300")}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
