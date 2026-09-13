import { useState } from "react";
import { CheckCircle2, RotateCcw, Printer, Download, Mail, CloudOff } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Button } from "../ui/Button";
import { BoardingPassCard } from "./BoardingPassCard";
import { downloadBoardingPass } from "../../lib/downloadPass";
import { useToast } from "../ui/Toast";

function NotificationRow({ icon: Icon, label, notification }) {
  if (!notification) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Icon className="h-3.5 w-3.5 text-slate-600" />
      {notification.sent ? (
        <span>
          {label} sent to <span className="font-medium text-slate-900">{notification.to}</span>
        </span>
      ) : (
        <span className="text-slate-400">{label} not sent — {notification.reason}</span>
      )}
    </div>
  );
}

export function StepSuccess() {
  const { state, dispatch } = useWizard();
  const { result } = state;
  const [isDownloading, setIsDownloading] = useState(false);
  const { showToast } = useToast();

  if (!result) return null;


  async function handleDownload() {
    setIsDownloading(true);
    try {
      await downloadBoardingPass({
        passenger: result.passenger,
        trip: result.trip,
        ship: result.ship,
        schedule: result.schedule,
        qrCodeDataUrl: result.qrCodeDataUrl,
        passNumber: result.passNumber,
      });
    } catch {
      showToast({ title: "Download failed", description: "Please try again.", variant: "error" });
    } finally {
      setIsDownloading(false);
    }
  }

  if (result.offline) {
    return (
      <div className="text-center print:mt-0">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 print:hidden">
          <CloudOff className="h-9 w-9 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 print:hidden">Saved Offline</h2>
        <p className="mt-1 text-sm text-slate-500 print:hidden">
          No connection right now. Your registration is saved on this device and will sync
          automatically once we&apos;re back online.
        </p>

        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            Offline Reference
          </p>
          <p className="mt-0.5 font-mono text-lg font-bold tracking-widest text-slate-900">
            {result.localId}
          </p>
          <div className="mt-4 space-y-1.5 border-t border-amber-200 pt-4 text-sm">
            <p>
              <span className="text-slate-500">Name:</span>{" "}
              <span className="font-medium text-slate-900">{result.passenger.fullName}</span>
            </p>
            <p>
              <span className="text-slate-500">Type:</span>{" "}
              <span className="font-medium text-slate-900">{result.passenger.passengerType}</span>
            </p>
          </div>
          <p className="mt-4 text-xs text-amber-700">
            Please show this screen to port staff if boarding before the sync completes.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-3 print:hidden">
          <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" onClick={() => dispatch({ type: "RESET" })}>
            <RotateCcw className="h-4 w-4" />
            Done / Next Passenger
          </Button>
        </div>
      </div>
    );
  }

  const { passenger, trip, ship, schedule, notifications } = result;

  return (
    <div className="text-center print:mt-0">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 print:hidden">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 print:hidden">Registration Complete</h2>
      <p className="mt-1 text-sm text-slate-500 print:hidden">
        Please keep your confirmation reference for boarding.
      </p>

      <div className="mt-8 print:mt-0">
        <BoardingPassCard
          passenger={passenger}
          trip={trip}
          ship={ship}
          schedule={schedule}
          qrCodeDataUrl={result.qrCodeDataUrl}
          passNumber={result.passNumber}
        />
      </div>

      {notifications?.email && (
        <div className="mx-auto mt-4 max-w-md space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 print:hidden">
          <NotificationRow icon={Mail} label="Email confirmation" notification={notifications.email} />
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Pass
        </Button>
        <Button variant="outline" size="lg" disabled={isDownloading} onClick={handleDownload}>
          <Download className="h-4 w-4" />
          {isDownloading ? "Preparing..." : "Download Pass"}
        </Button>
        <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" onClick={() => dispatch({ type: "RESET" })}>
          <RotateCcw className="h-4 w-4" />
          Done / Next Passenger
        </Button>
      </div>
    </div>
  );
}
