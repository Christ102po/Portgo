import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, Printer, Mail, MessageSquare, CloudOff, RefreshCw } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Button } from "../ui/Button";
import { FamilyBoardingPassCard } from "./FamilyBoardingPassCard";
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

export function StepGroupSuccess() {
  const { state, dispatch } = useWizard();
  const { result } = state;
  const [isResending, setIsResending] = useState(false);
  const [smsStatus, setSmsStatus] = useState(null);
  const { showToast } = useToast();

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

  async function handleResendSms() {
    setIsResending(true);
    try {
      const res = await apiClient.post(`/family-bookings/${result.familyBooking.id}/resend-sms`);
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

  if (result.offline) {
    return (
      <div className="text-center print:mt-0">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 print:hidden">
          <CloudOff className="h-9 w-9 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 print:hidden">Group Saved Offline</h2>
        <p className="mt-1 text-sm text-slate-500 print:hidden">
          No connection right now. Your group registration is saved on this device and will sync
          automatically once we&apos;re back online.
        </p>

        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Offline Reference</p>
          <p className="mt-0.5 font-mono text-lg font-bold tracking-widest text-slate-900">{result.localId}</p>
          <div className="mt-4 space-y-1.5 border-t border-amber-200 pt-4 text-sm">
            <p>
              <span className="text-slate-500">Head of Group:</span>{" "}
              <span className="font-medium text-slate-900">{result.headFullName}</span>
            </p>
            <p>
              <span className="text-slate-500">Travelers:</span>{" "}
              <span className="font-medium text-slate-900">{result.memberCount}</span>
            </p>
          </div>
          <p className="mt-4 text-xs text-amber-700">
            Please show this screen to port staff if boarding before the sync completes.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-3 print:hidden">
          <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" onClick={() => dispatch({ type: "RESET" })}>
            <RotateCcw className="h-4 w-4" />
            Done / Next Group
          </Button>
        </div>
      </div>
    );
  }

  const { familyBooking, trips, ship, schedule, notifications } = result;

  return (
    <div className="text-center print:mt-0">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 print:hidden">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 print:hidden">Group Registration Complete</h2>
      <p className="mt-1 text-sm text-slate-500 print:hidden">
        Scan the master QR code once at the gate to board the whole group.
      </p>

      <div className="mt-8 print:mt-0">
        <FamilyBoardingPassCard
          familyBooking={familyBooking}
          trips={trips}
          ship={ship}
          schedule={schedule}
          qrCodeDataUrl={result.masterQrCodeDataUrl}
          masterCode={result.masterCode}
        />
      </div>

      {(notifications?.email || smsStatus) && (
        <div className="mx-auto mt-4 max-w-md space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 print:hidden">
          <NotificationRow icon={Mail} label="Email confirmation" notification={notifications?.email} />
          <NotificationRow icon={MessageSquare} label="SMS confirmation" notification={smsStatus} />
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
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3 print:hidden">
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Confirmation
        </Button>
        <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" onClick={() => dispatch({ type: "RESET" })}>
          <RotateCcw className="h-4 w-4" />
          Done / Next Group
        </Button>
      </div>
    </div>
  );
}
