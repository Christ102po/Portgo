import { TimerReset } from "lucide-react";
import { Button } from "../ui/Button";

export function IdleResetModal({ open, secondsLeft, onStay }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm print:hidden">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <TimerReset className="h-7 w-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-graphite">Still there?</h3>
        <p className="mt-1.5 text-sm text-slate-500">
          For the next passenger&apos;s privacy, this session will reset in
        </p>
        <p className="mt-2 font-mono text-5xl font-black tabular-nums text-amber-600">{secondsLeft}</p>
        <Button variant="kiosk" size="lg" className="mt-6 h-auto w-full px-8 py-3.5 rounded-xl" onClick={onStay}>
          I&apos;m Still Here
        </Button>
      </div>
    </div>
  );
}
