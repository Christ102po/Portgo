import { cn } from "../../lib/cn";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-200/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
