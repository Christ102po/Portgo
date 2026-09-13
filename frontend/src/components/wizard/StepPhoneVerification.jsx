import { useEffect, useState } from "react";
import { ChevronLeft, Phone, BadgeCheck, XCircle, ShieldCheck } from "lucide-react";
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
    if (!phoneIsValid || cooldown > 0) return;
    setIsSending(true);
    try {
      const res = await apiClient.post("/otp/send", { phone: state.phone });
      setModalOpen(true);
      setCooldown(60);
      showToast({
        title: "OTP sent",
        description: res.data.message || "Check your phone for the 6-digit verification code.",
        variant: "info",
      });
    } catch (err) {
      const fieldMessage = err.response?.data?.details?.fieldErrors?.phone?.[0];
      showToast({
        title: "Unable to send OTP",
        description: fieldMessage || err.response?.data?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
        <ShieldCheck className="h-6 w-6 text-emerald-600" />
      </div>
      <h2 className="mb-1 text-center text-xl font-semibold text-slate-900">
        Verify Your Phone Number
      </h2>
      <p className="mx-auto mb-8 max-w-md text-center text-sm text-slate-500">
        We&apos;ll send one 6-digit OTP to confirm that you have access to this mobile number.
      </p>

      <Card className="mx-auto max-w-md border-slate-200/80 shadow-sm">
        <CardContent className="pt-6">
          <Label htmlFor="phone">Contact Number</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="phone"
                className="pl-9"
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
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleSendCode}
              disabled={isSending || !phoneIsValid || cooldown > 0}
            >
              {isSending
                ? "Sending..."
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : state.isPhoneVerified
                ? "Send New Code"
                : "Send OTP"}
            </Button>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-400">
            By requesting an OTP, you agree to receive a one-time verification SMS from PORTGO. The code is used only to verify ownership of this number.
          </p>

          {state.phone && !phoneIsValid && hasInvalidPrefix && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2">
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              <p className="text-xs font-semibold text-red-700">{INVALID_PH_PREFIX_MESSAGE}</p>
            </div>
          )}
          {state.phone && !phoneIsValid && !hasInvalidPrefix && (
            <p className="mt-2 text-xs text-red-600">
              Enter a valid PH mobile number (e.g. 0917-123-4567)
            </p>
          )}

          {state.isPhoneVerified && state.phoneVerificationToken && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-4 w-4" />
              Phone number verified
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
          className="h-auto w-full rounded-xl px-8 py-3.5 sm:w-auto"
          disabled={!state.isPhoneVerified || !state.phoneVerificationToken}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          Continue
        </Button>
      </div>

      <OtpModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        phone={state.phone}
        cooldown={cooldown}
        onResend={handleSendCode}
        onVerified={({ verificationToken }) => {
          dispatch({
            type: "SET_FIELDS",
            fields: {
              isPhoneVerified: true,
              phoneVerificationToken: verificationToken,
            },
          });
        }}
      />
    </div>
  );
}
