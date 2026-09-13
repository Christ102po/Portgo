import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
  {
    variants: {
      variant: {
        primary: "bg-emerald-900 text-white hover:bg-emerald-800 focus-visible:ring-emerald-900",
        accent: "bg-mint text-graphite hover:bg-mint-dark focus-visible:ring-mint",
        outline: "border border-slate-300 bg-white text-ink hover:bg-slate-50 focus-visible:ring-graphite",
        ghost: "text-ink hover:bg-slate-100 focus-visible:ring-graphite",
        danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
        kiosk: "cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 active:scale-95 focus-visible:ring-emerald-600",
        glass: "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-400",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Button = forwardRef(function Button(
  { className, variant, size, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { Button, buttonVariants };
