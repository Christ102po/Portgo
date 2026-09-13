import { createContext, useCallback, useContext, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "../../lib/cn";

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ title, description, variant = "info" }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, description, variant }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
        {children}
        {toasts.map((t) => {
          const Icon = icons[t.variant] || Info;
          return (
            <ToastPrimitive.Root
              key={t.id}
              onOpenChange={(open) => !open && dismiss(t.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-white p-4 shadow-card transition-all",
                t.variant === "success" && "border-mint",
                t.variant === "error" && "border-red-300",
                t.variant === "info" && "border-slate-200"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  t.variant === "success" && "text-mint-dark",
                  t.variant === "error" && "text-red-600",
                  t.variant === "info" && "text-graphite"
                )}
              />
              <div className="flex-1">
                {t.title && (
                  <ToastPrimitive.Title className="text-sm font-semibold text-ink">
                    {t.title}
                  </ToastPrimitive.Title>
                )}
                {t.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-sm text-slate-500">
                    {t.description}
                  </ToastPrimitive.Description>
                )}
              </div>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] m-0 flex w-96 max-w-[100vw] list-none flex-col gap-2 p-6 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
