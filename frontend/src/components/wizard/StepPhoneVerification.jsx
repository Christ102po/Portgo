import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Phone, BadgeCheck, XCircle, MessageSquareText, ShieldCheck } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { OtpModal } from "./OtpModal";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";
import { Card, CardContent } from "../ui/Card";
import { formatPhonePH, isValidPhonePH, phoneDigits } from "../../lib/format";
import { hasPhMobileFormat, isValidPhMobilePrefix, INVALID_PH_PREFIX_MESSAGE } from "../../lib/phPrefixes";

export function StepPhoneVerification() {
  const { state, dispatch } = useWizard();
  const [isSending, setIsSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const lastAutoPhoneRef = useRef("");
  const { showToast } = useToast();
  const digits = phoneDigits(state.phone);
  const hasBasicFormat = hasPhMobileFormat(digits);
  const hasInvalidPrefix = hasBasicFormat && !isValidPhMobilePrefix(digits);
  const phoneIsValid = isValidPhonePH(state.phone);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleSendCode() {
    if (!phoneIsValid || cooldown > 0 || isSending) return;
    setIsSending(true);
    try {
      const res = await apiClient.post("/otp/send", { phone: state.phone });
      setCodeSent(true);
      setModalOpen(true);
      setCooldown(60);
      showToast({
        title: "Verification code sent",
        description: res.data.message || "Check your phone for the 6-digit verification code.",
        variant: "info",
      });
    } catch (err) {
      setCodeSent(false);
      const fieldMessage = err.response?.data?.details?.fieldErrors?.phone?.[0];
      showToast({
        title: "Failed to send code",
        description: fieldMessage || err.response?.data?.message || "Please check your connection and try the number again.",
        variant: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  // No Send OTP button is needed. As soon as a complete, valid PH mobile
  // number is entered, wait briefly for typing to settle and send the OTP once.
  useEffect(() => {
    const normalized = phoneDigits(state.phone);

    if (!phoneIsValid) {
      lastAutoPhoneRef.current = "";
      setCodeSent(false);
      return;
    }
    if (state.isPhoneVerified || isSending || cooldown > 0) return;
    if (lastAutoPhoneRef.current === normalized) return;

    const timer = window.setTimeout(() => {
      lastAutoPhoneRef.current = normalized;
      handleSendCode();
    }, 450);

    return () => window.clearTimeout(timer);
    // handleSendCode intentionally reads the latest render state. The guarded
    // fields below prevent duplicate automatic sends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phone, phoneIsValid, state.isPhoneVerified, isSending, cooldown]);

  return (
    <div>
      <h2 className="section-title">Verify Your Phone Number</h2>
      <p className="section-subtitle mb-6">
        Enter your mobile number. PORTGO will automatically send the OTP as soon as the number is complete.
      </p>

      <Card className="mx-auto max-w-md overflow-hidden border-emerald-100 shadow-[0_22px_50px_-32px_rgba(6,78,59,0.65)]">
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 px-5 py-5 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">Secure verification</p>
              <p className="mt-0.5 text-lg font-black">SMS OTP</p>
            </div>
          </div>
        </div>

        <CardContent className="pt-5 sm:pt-6">
          <Label htmlFor="phone">Contact Number</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
            <Input
              id="phone"
              className="h-14 rounded-2xl border-emerald-100 bg-emerald-50/45 pl-10 text-base font-bold tracking-wide focus:border-emerald-500 focus:bg-white"
              placeholder="0917-123-4567"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
              value={state.phone}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "phone", value: formatPhonePH(e.target.value) })
              }
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            No send button needed — OTP delivery starts automatically after a valid 11-digit Philippine mobile number is entered.
          </p>

          {state.phone && !phoneIsValid && hasInvalidPrefix && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              <p className="text-xs font-semibold text-red-700">{INVALID_PH_PREFIX_MESSAGE}</p>
            </div>
          )}
          {state.phone && !phoneIsValid && !hasInvalidPrefix && (
            <p className="mt-3 text-xs font-medium text-red-600">
              Complete the number using this format: 0917-123-4567.
            </p>
          )}

          {isSending && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
              <MessageSquareText className="h-4 w-4 animate-pulse" />
              Number complete — sending your OTP automatically...
            </div>
          )}

          {!isSending && codeSent && !state.isPhoneVerified && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              <span className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 shrink-0" />
                Code sent to {state.phone}. Tap to enter the OTP.
              </span>
              <span className="text-xs text-emerald-600">Open</span>
            </button>
          )}

          {state.isPhoneVerified && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-4 w-4" />
              Phone number verified.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mobile-action-bar">
        <Button variant="outline" size="lg" onClick={() => dispatch({ type: "PREV_STEP" })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          variant="kiosk"
          size="lg"
          className="h-auto w-full rounded-2xl px-8 py-3.5 sm:w-auto"
          disabled={!state.isPhoneVerified}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          Continue
        </Button>
      </div>

      <OtpModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        phone={state.phone}
        defaultEmail={state.email}
        cooldown={cooldown}
        onResend={handleSendCode}
        allowEmailFallback={false}
        onVerified={({ channel, identifier } = {}) => {
          setCodeSent(false);
          if (channel === "email" && identifier && identifier.includes("@")) {
            dispatch({
              type: "SET_FIELDS",
              fields: { isPhoneVerified: true, email: identifier, isEmailVerified: true },
            });
          } else {
            dispatch({ type: "SET_FIELD", field: "isPhoneVerified", value: true });
          }
        }}
      />
    </div>
  );
}
