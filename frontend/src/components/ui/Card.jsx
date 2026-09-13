import { cn } from "../../lib/cn";

function Card({ className, dark = false, ...props }) {
  return (
    <div
      className={cn(
        dark
          ? "rounded-3xl border border-white/10 bg-white/5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          : "rounded-2xl border border-gray-100 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return <div className={cn("p-6 pb-3", className)} {...props} />;
}

function CardTitle({ className, dark = false, ...props }) {
  return (
    <h3 className={cn("text-lg font-semibold", dark ? "text-white" : "text-graphite", className)} {...props} />
  );
}

function CardDescription({ className, dark = false, ...props }) {
  return <p className={cn("text-sm", dark ? "text-white/60" : "text-slate-500", className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
