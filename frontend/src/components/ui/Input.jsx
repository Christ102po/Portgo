import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const Input = forwardRef(function Input({ className, dark = false, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl px-4 text-sm shadow-soft transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        dark
          ? "border border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/40"
          : "border border-slate-200 bg-white text-ink placeholder:text-slate-400 focus:border-graphite focus:ring-2 focus:ring-graphite",
        className
      )}
      {...props}
    />
  );
});

export { Input };
