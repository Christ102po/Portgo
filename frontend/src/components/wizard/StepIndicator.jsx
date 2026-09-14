import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

const LOCAL_LABELS = ["Passenger", "Direction", "Verify", "Details", "Trip", "Confirm"];
const TOURIST_LABELS = ["Passenger", "Direction", "Selfie", "Details", "Trip", "Confirm"];
const GROUP_LABELS = ["Group", "Direction", "Members", "Trip", "Confirm"];

export function StepIndicator({ currentStep, passengerType, totalSteps = 6, isGroupMode = false }) {
  const labels = isGroupMode ? GROUP_LABELS : passengerType === "FOREIGN_TOURIST" ? TOURIST_LABELS : LOCAL_LABELS;
  const visibleLabels = labels.slice(0, totalSteps);
  const progressPct = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-[22px] border border-emerald-100 bg-white/90 p-2 shadow-[0_14px_36px_-28px_rgba(6,78,59,0.55)] backdrop-blur">
        <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
          {visibleLabels.map((label, idx) => {
            const step = idx + 1;
            const isActive = step === currentStep;
            const isComplete = step < currentStep;
            return (
              <div
                key={label}
                className={cn(
                  "flex min-w-max flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-extrabold transition-all",
                  isActive && "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-900/10",
                  isComplete && "bg-emerald-50 text-emerald-700",
                  !isActive && !isComplete && "text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px]",
                    isActive && "bg-white/18 text-white ring-1 ring-white/30",
                    isComplete && "bg-emerald-600 text-white",
                    !isActive && !isComplete && "bg-slate-100 text-slate-400"
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : step}
                </span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-[width] duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
