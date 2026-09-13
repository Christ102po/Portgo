import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/cn";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

function DropdownMenuContent({ className, sideOffset = 6, align = "end", ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-card backdrop-blur-md",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({ className, danger, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-ink outline-none transition-colors data-[highlighted]:bg-surface",
        danger && "text-red-600 data-[highlighted]:bg-red-50",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }) {
  return <DropdownMenuPrimitive.Separator className={cn("my-1 h-px bg-slate-100", className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
