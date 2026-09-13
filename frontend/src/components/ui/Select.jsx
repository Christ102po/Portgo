import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

function Select({ value, onValueChange, placeholder, options, className, disabled, dark = false }) {
  return (
    <SelectPrimitive.Root value={value ?? undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl px-4 text-sm shadow-soft transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          dark
            ? "border border-white/15 bg-white/5 text-white focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/40 data-[placeholder]:text-white/30"
            : "border border-slate-200 bg-white text-ink focus:border-graphite focus:ring-2 focus:ring-graphite data-[placeholder]:text-slate-400",
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className={cn("h-4 w-4", dark ? "text-white/40" : "text-slate-400")} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "z-50 max-h-72 overflow-hidden rounded-xl shadow-card",
            dark ? "border border-white/10 bg-slate-900" : "border border-slate-200 bg-white"
          )}
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none data-[state=checked]:font-semibold data-[disabled]:cursor-not-allowed",
                  dark
                    ? "text-white data-[highlighted]:bg-white/10 data-[disabled]:text-white/20 data-[disabled]:data-[highlighted]:bg-transparent"
                    : "text-ink data-[highlighted]:bg-surface data-[disabled]:text-slate-300 data-[disabled]:data-[highlighted]:bg-transparent"
                )}
              >
                <span className="absolute left-2.5 inline-flex h-4 w-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className={cn("h-4 w-4", dark ? "text-emerald-400" : "text-graphite")} />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
