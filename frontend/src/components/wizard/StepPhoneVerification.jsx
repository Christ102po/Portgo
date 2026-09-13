import { useEffect, useState } from "react";
import { ChevronLeft, Phone, BadgeCheck, XCircle } from "lucide-react";
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
        title: "Code sent",
        description: res.data.message || "Check your phone for the verification code.",
        variant: "info",
      });
    } catch (err) {
      const fieldMessage = err.response?.data?.details?.fieldErrors?.phone?.[0];
      showToast({
        title: "Failed to send code",
        description: fieldMessage || err.response?.data?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold text-slate-900">
        Verify Your Phone Number
      </h2>
      <p className="mb-8 text-center text-sm text-slate-500">
        We&apos;ll send a code to confirm it&apos;s really you.
      </p>

      <Card className="mx-auto max-w-md border-slate-200/80 shadow-sm">
        <CardContent className="pt-6">
          <Label htmlFor="phone">Contact Number</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="phone"
                className="pl-9"
                placeholder="0917-123-4567"
                inputMode="numeric"
                maxLength={13}
                value={state.phone}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "phone", value: formatPhonePH(e.target.value) })
                }
              />
            </div>
            <Button
              variant="outline"
              onClick={handleSendCode}
              disabled={isSending || !phoneIsValid || cooldown > 0}
            >
              {isSending
                ? "Sending..."
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : state.isPhoneVerified
                ? "Resend"
                : "Send Code"}
            </Button>
          </div>

          {state.phone && !phoneIsValid && hasInvalidPrefix && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2">
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              <p className="text-xs font-semibold text-red-700">{INVALID_PH_PREFIX_MESSAGE}</p>
            </div>
          )}
          {state.phone && !phoneIsValid && !hasInvalidPrefix && (
            <p className="mt-2 text-xs text-red-600">
              Enter a valid PH mobile number (e.g. 0917-123-4567)
            </p>
          )}

          {state.isPhoneVerified && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-4 w-4" />
              Phone Number Verified!
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
          className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl"
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
        onVerified={({ channel, identifier } = {}) => {
          if (channel === "email" && identifier && identifier.includes("@")) {
            // Passenger confirmed ownership of this address — carry it into the
            // record so it shows up automatically and pre-fills Step 4.
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
