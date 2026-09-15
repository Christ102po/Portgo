import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, RotateCcw, Printer, Download, Mail, MessageSquare, CloudOff, RefreshCw } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Button } from "../ui/Button";
import { BoardingPassCard } from "./BoardingPassCard";
import { downloadBoardingPass } from "../../lib/downloadPass";
import { apiClient } from "../../lib/apiClient";
import { cn } from "../../lib/cn";
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
  const [isResending, setIsResending] = useState(false);
  const [smsStatus, setSmsStatus] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!result || result.offline) return;
    setSmsStatus(result.notifications?.sms || null);
    if (result.notifications?.sms?.sent) {
      showToast({
        title: "SMS Confirmation Sent!",
        description: `Digital pass link texted to ${result.notifications.sms.to}.`,
        variant: "success",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result) return null;

  function finishSession() {
    dispatch({ type: "RESET" });
    navigate("/");
  }

  async function handleResendSms() {
    setIsResending(true);
    try {
      const endpoint = result.familyBooking
        ? `/family-bookings/${result.familyBooking.id}/resend-sms`
        : `/passengers/${result.trip.id}/resend-sms`;
      const res = await apiClient.post(endpoint);
      setSmsStatus(res.data.sms);
      showToast({
        title: res.data.sms.sent ? "SMS Confirmation Resent!" : "Resend failed",
        description: res.data.sms.sent
          ? `Digital pass link texted to ${res.data.sms.to}.`
          : res.data.sms.reason,
        variant: res.data.sms.sent ? "success" : "error",
      });
    } catch {
      showToast({ title: "Resend failed", description: "Please try again.", variant: "error" });
    } finally {
      setIsResending(false);
    }
  }

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
          <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" onClick={finishSession}>
            <RotateCcw className="h-4 w-4" />
            Finish / Kiosk Home
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
        {result.familyBooking
          ? `The primary passenger's QR covers all ${result.familyBooking.memberCount} registered travelers.`
          : "Please keep your confirmation reference for boarding."}
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

      {result.familyBooking && result.trips?.length > 1 && (
        <div className="mx-auto mt-4 max-w-md rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left print:hidden">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800">Registered Travelers</p>
          <p className="mt-1 text-xs leading-5 text-emerald-700/75">Only the primary passenger above receives a QR code. Accompanying members are recorded in the admin manifest under the same group.</p>
          <div className="mt-3 space-y-2">
            {result.trips.map((registeredTrip, index) => (
              <div key={registeredTrip.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
                <span className="text-sm font-bold text-slate-900">{registeredTrip.passenger?.fullName || (index === 0 ? passenger.fullName : `Member ${index}`)}</span>
                <span className="text-[11px] font-semibold text-emerald-700">{index === 0 ? "Primary / QR holder" : "Recorded member"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(notifications?.email || smsStatus) && (
        <div className="mx-auto mt-4 max-w-md space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 print:hidden">
          <NotificationRow icon={Mail} label="Email confirmation" notification={notifications?.email} />
          <NotificationRow icon={MessageSquare} label="SMS confirmation" notification={smsStatus} />
          {passenger.contactNumber && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleResendSms}
              disabled={isResending}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isResending && "animate-spin")} />
              {isResending ? "Resending..." : "Resend SMS Confirmation"}
            </Button>
          )}
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
        <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" onClick={finishSession}>
          <RotateCcw className="h-4 w-4" />
          Finish / Kiosk Home
        </Button>
      </div>
    </div>
  );
}
