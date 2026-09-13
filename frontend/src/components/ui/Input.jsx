import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const Input = forwardRef(function Input({ className, dark = false, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl px-4 text-[15px] font-medium outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        dark
          ? "border border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          : "border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10",
        className
      )}
      {...props}
    />
  );
});

export { Input };
