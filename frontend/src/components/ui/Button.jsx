import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold tracking-[-0.01em] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none disabled:active:scale-100",
  {
    variants: {
      variant: {
        primary: "bg-emerald-900 text-white shadow-[0_10px_24px_-14px_rgba(6,78,59,0.8)] hover:bg-emerald-800",
        accent: "bg-mint text-graphite shadow-sm hover:bg-mint-dark",
        outline: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        kiosk: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_14px_30px_-16px_rgba(5,150,105,0.9)] hover:from-emerald-700 hover:to-teal-700",
        glass: "border border-white/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur-md hover:bg-white",
      },
      size: {
        sm: "h-10 px-3.5 text-sm",
        md: "h-12 px-5",
        lg: "h-14 px-6 text-[15px] sm:px-8 sm:text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Button = forwardRef(function Button({ className, variant, size, ...props }, ref) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export { Button, buttonVariants };
