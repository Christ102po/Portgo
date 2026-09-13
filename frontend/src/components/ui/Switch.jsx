import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/cn";

function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full bg-slate-200 transition-colors data-[state=checked]:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-graphite focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white shadow-soft transition-transform data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
