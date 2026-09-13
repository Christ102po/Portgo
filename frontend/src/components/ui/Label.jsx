import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../../lib/cn";

function Label({ className, dark = false, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn("mb-1.5 block text-sm font-medium", dark ? "text-white/70" : "text-ink", className)}
      {...props}
    />
  );
}

export { Label };
