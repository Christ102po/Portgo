import { cn } from "../../lib/cn";

function Card({ className, dark = false, ...props }) {
  return (
    <div
      className={cn(
        dark
          ? "rounded-[28px] border border-white/10 bg-white/5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          : "rounded-[26px] border border-slate-200/70 bg-white/95 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return <div className={cn("p-5 pb-3 sm:p-6 sm:pb-3", className)} {...props} />;
}

function CardTitle({ className, dark = false, ...props }) {
  return <h3 className={cn("text-lg font-bold tracking-tight", dark ? "text-white" : "text-slate-950", className)} {...props} />;
}

function CardDescription({ className, dark = false, ...props }) {
  return <p className={cn("text-sm leading-6", dark ? "text-white/60" : "text-slate-500", className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
