import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
  {
    variants: {
      variant: {
        active: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
        neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10",
        graphite: "bg-graphite text-white",
        outline: "border border-slate-300 text-slate-600",
        danger: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20",
        warning: "bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-600/20",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
