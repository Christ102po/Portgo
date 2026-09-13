import { UserRound, Accessibility, HeartHandshake, Armchair, GraduationCap, Baby, Smile, Siren } from "lucide-react";
import { cn } from "../lib/cn";

const FLAG_META = {
  Medical: { icon: Siren, className: "bg-red-100 text-red-700" },
  Senior: { icon: UserRound, className: "bg-amber-100 text-amber-700" },
  PWD: { icon: Accessibility, className: "bg-blue-100 text-blue-700" },
  Pregnant: { icon: HeartHandshake, className: "bg-pink-100 text-pink-700" },
  Wheelchair: { icon: Armchair, className: "bg-indigo-100 text-indigo-700" },
  Student: { icon: GraduationCap, className: "bg-violet-100 text-violet-700" },
  Infant: { icon: Baby, className: "bg-teal-100 text-teal-700" },
  Minor: { icon: Smile, className: "bg-cyan-100 text-cyan-700" },
};

const DEFAULT_META = { icon: HeartHandshake, className: "bg-slate-100 text-slate-600" };

export function PriorityTags({ flags, size = "sm", className }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {flags.map((flag) => {
        const meta = FLAG_META[flag] || DEFAULT_META;
        const Icon = meta.icon;
        return (
          <span
            key={flag}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              size === "sm" ? "text-[10px]" : "text-xs",
              meta.className,
              "print:border print:border-black print:bg-white print:text-black"
            )}
          >
            <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            {flag}
          </span>
        );
      })}
    </div>
  );
}
