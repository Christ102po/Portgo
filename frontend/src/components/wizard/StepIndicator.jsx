import { cn } from "../../lib/cn";

const LOCAL_LABELS = ["Passenger", "Direction", "Verify", "Details", "Trip", "Confirm"];
const TOURIST_LABELS = ["Passenger", "Direction", "Selfie", "Details", "Trip", "Confirm"];
const GROUP_LABELS = ["Group", "Transaction", "Members", "Trip", "Confirm"];

export function StepIndicator({ currentStep, passengerType, totalSteps = 6, isGroupMode = false }) {
  const LABELS = isGroupMode ? GROUP_LABELS : passengerType === "FOREIGN_TOURIST" ? TOURIST_LABELS : LOCAL_LABELS;
  const progressPct = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-2">
      <div className="relative h-1.5 w-full rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-slate-800 to-slate-900 transition-[width] duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 shadow-lg ring-4 ring-emerald-500/30 transition-[left] duration-500 ease-out"
          style={{ left: `${progressPct}%` }}
        />
      </div>

      <div className="mt-4 flex items-start justify-between">
        {LABELS.slice(0, totalSteps).map((label, idx) => {
          const step = idx + 1;
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          return (
            <span
              key={label}
              className={cn(
                "flex-1 truncate px-0.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors",
                idx === 0 && "text-left",
                idx === LABELS.slice(0, totalSteps).length - 1 && "text-right",
                isActive ? "text-slate-900" : isComplete ? "text-slate-500" : "text-slate-300"
              )}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
