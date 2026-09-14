import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Phone, Mail, BadgeCheck, XCircle, MessageSquareText, ShieldCheck } from "lucide-react";
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function StepPhoneVerification() {
  const { state, dispatch } = useWizard();
  const [verificationMethod, setVerificationMethod] = useState(state.email && !state.phone ? "email" : "sms");
  const [isSending, setIsSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const lastAutoIdentifierRef = useRef("");
  const { showToast } = useToast();

  const digits = phoneDigits(state.phone);
  const hasBasicFormat = hasPhMobileFormat(digits);
  const hasInvalidPrefix = hasBasicFormat && !isValidPhMobilePrefix(digits);
  const phoneIsValid = isValidPhonePH(state.phone);
  const emailIsValid = isValidEmail(state.email);
  const identifier = verificationMethod === "email" ? state.email.trim() : state.phone;
  const identifierIsValid = verificationMethod === "email" ? emailIsValid : phoneIsValid;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function changeMethod(method) {
    setVerificationMethod(method);
    setCodeSent(false);
    setModalOpen(false);
    setCooldown(0);
    lastAutoIdentifierRef.current = "";
    dispatch({
      type: "SET_FIELDS",
      fields: {
        isPhoneVerified: false,
        isEmailVerified: false,
        groupPhoneVerificationToken: "",
        contactVerificationIdentifier: "",
        contactVerificationChannel: method,
        contactVerificationToken: "",
      },
    });
  }

  async function handleSendCode() {
    if (!identifierIsValid || cooldown > 0 || isSending) return;
    setIsSending(true);
    try {
      const res = await apiClient.post("/otp/send", {
        phone: identifier,
        channel: verificationMethod,
      });
      setCodeSent(true);
      setModalOpen(true);
      setCooldown(60);
      showToast({
        title: "Verification code sent",
        description:
          res.data.message ||
          (verificationMethod === "email"
            ? "Check your email for the 6-digit verification code."
            : "Check your phone for the 6-digit verification code."),
        variant: "info",
      });
    } catch (err) {
      setCodeSent(false);
      const fieldMessage = err.response?.data?.details?.fieldErrors?.phone?.[0];
      showToast({
        title: "Failed to send code",
        description: fieldMessage || err.response?.data?.message || "Please check your details and try again.",
        variant: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  // Automatically send after a complete valid phone number OR email address.
  useEffect(() => {
    const normalized = verificationMethod === "email" ? state.email.trim().toLowerCase() : phoneDigits(state.phone);

    if (!identifierIsValid) {
      lastAutoIdentifierRef.current = "";
      setCodeSent(false);
      return;
    }
    if (state.isPhoneVerified || isSending || cooldown > 0) return;
    if (lastAutoIdentifierRef.current === normalized) return;

    const timer = window.setTimeout(() => {
      lastAutoIdentifierRef.current = normalized;
      handleSendCode();
    }, verificationMethod === "email" ? 700 : 450);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phone, state.email, verificationMethod, identifierIsValid, state.isPhoneVerified, isSending, cooldown]);

  return (
    <div>
      <h2 className="section-title">Verify Your Contact</h2>
      <p className="section-subtitle mb-6">
        Choose SMS or email. PORTGO automatically sends the OTP once your contact information is complete.
      </p>

      <Card className="mx-auto max-w-md overflow-hidden border-emerald-100 shadow-[0_22px_50px_-32px_rgba(6,78,59,0.65)]">
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 px-5 py-5 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">Secure verification</p>
              <p className="mt-0.5 text-lg font-black">OTP Verification</p>
            </div>
          </div>
        </div>

        <CardContent className="pt-5 sm:pt-6">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => changeMethod("sms")}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                verificationMethod === "sms" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Phone className="h-4 w-4" /> SMS
            </button>
            <button
              type="button"
              onClick={() => changeMethod("email")}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                verificationMethod === "email" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Mail className="h-4 w-4" /> Email
            </button>
          </div>

          {verificationMethod === "sms" ? (
            <>
              <Label htmlFor="phone">Mobile Number</Label>
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
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "phone", value: formatPhonePH(e.target.value) })}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                No send button needed — OTP is sent automatically after a valid Philippine mobile number is entered.
              </p>

              {state.phone && !phoneIsValid && hasInvalidPrefix && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-xs font-semibold text-red-700">{INVALID_PH_PREFIX_MESSAGE}</p>
                </div>
              )}
              {state.phone && !phoneIsValid && !hasInvalidPrefix && (
                <p className="mt-3 text-xs font-medium text-red-600">Complete the number using this format: 0917-123-4567.</p>
              )}
            </>
          ) : (
            <>
              <Label htmlFor="verificationEmail">Email Address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                <Input
                  id="verificationEmail"
                  type="email"
                  className="h-14 rounded-2xl border-emerald-100 bg-emerald-50/45 pl-10 text-base font-semibold focus:border-emerald-500 focus:bg-white"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={state.email}
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "email", value: e.target.value.trimStart() })}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                If you do not have a mobile number, enter your email. The 6-digit code is sent automatically once the email is valid.
              </p>
              {state.email && !emailIsValid && (
                <p className="mt-3 text-xs font-medium text-red-600">Enter a valid email address, for example name@gmail.com.</p>
              )}
            </>
          )}

          {isSending && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
              <MessageSquareText className="h-4 w-4 animate-pulse" />
              Contact complete — sending your OTP automatically...
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
                Code sent to {identifier}. Tap to enter the OTP.
              </span>
              <span className="text-xs text-emerald-600">Open</span>
            </button>
          )}

          {state.isPhoneVerified && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-4 w-4" />
              {verificationMethod === "email" ? "Email address verified." : "Phone number verified."}
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
        phone={identifier}
        defaultEmail={state.email}
        initialChannel={verificationMethod}
        cooldown={cooldown}
        onResend={handleSendCode}
        allowEmailFallback={false}
        onVerified={({ channel, identifier: verifiedIdentifier, verificationToken } = {}) => {
          setCodeSent(false);
          dispatch({
            type: "SET_FIELDS",
            fields: {
              isPhoneVerified: true,
              isEmailVerified: channel === "email",
              email: channel === "email" ? verifiedIdentifier : state.email,
              groupPhoneVerificationToken: verificationToken || "",
              contactVerificationIdentifier: verifiedIdentifier || identifier,
              contactVerificationChannel: channel || verificationMethod,
              contactVerificationToken: verificationToken || "",
            },
          });
        }}
      />
    </div>
  );
}
