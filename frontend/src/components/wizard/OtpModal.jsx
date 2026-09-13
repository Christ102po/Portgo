import { useEffect, useState } from "react";
import { ShieldCheck, Mail, MessageSquareText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";
import { cn } from "../../lib/cn";

const INVALID_CODE_MESSAGE = "Invalid verification code. Please check your code and try again.";

export function OtpModal({ open, onOpenChange, phone, defaultEmail, onVerified, cooldown = 0, onResend }) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState("sms");
  const [identifier, setIdentifier] = useState(phone);
  const [emailInput, setEmailInput] = useState(defaultEmail || "");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setCode("");
      setError("");
      setChannel("sms");
      setIdentifier(phone);
      setEmailSent(false);
    }
  }, [open, phone]);

  function handleCodeChange(e) {
    setCode(e.target.value.replace(/\D/g, ""));
    if (error) setError("");
  }

  async function handleVerify(e) {
    e.preventDefault();
    setIsVerifying(true);
    setError("");
    try {
      const res = await apiClient.post("/otp/verify", { phone: identifier, code });
      if (res.data.verified) {
        showToast({ title: "Verified!", variant: "success" });
        onVerified({ channel, identifier });
        onOpenChange(false);
      }
    } catch (err) {
      const message = err.response?.data?.message;
      setError(message === "Invalid code" ? INVALID_CODE_MESSAGE : message || INVALID_CODE_MESSAGE);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleSendEmailCode() {
    if (!emailInput.trim()) return;
    setIsSendingEmail(true);
    try {
      const res = await apiClient.post("/otp/send", { phone: emailInput.trim(), channel: "email" });
      setIdentifier(emailInput.trim());
      setEmailSent(true);
      setCode("");
      setError("");
      showToast({
        title: "Code sent",
        description: res.data.message || "Check your email for the verification code.",
        variant: "info",
      });
    } catch (err) {
      showToast({
        title: "Failed to send code",
        description: err.response?.data?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSendingEmail(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-mint-dark" />
          Enter Verification Code
        </DialogTitle>
        <DialogDescription>
          {channel === "sms" ? (
            <>
              We sent a 6-digit code via SMS to <span className="font-medium text-ink">{phone}</span>.
            </>
          ) : emailSent ? (
            <>
              We sent a 6-digit code to <span className="font-medium text-ink">{identifier}</span>.
            </>
          ) : (
            "Enter your email address to receive a verification code instead."
          )}
        </DialogDescription>

        <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setChannel("sms")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              channel === "sms" ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"
            )}
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            SMS
          </button>
          <button
            type="button"
            onClick={() => setChannel("email")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              channel === "email" ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"
            )}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
        </div>

        {channel === "email" && !emailSent && (
          <div className="mt-3 flex gap-2">
            <Input
              type="email"
              placeholder="you@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSendEmailCode}
              disabled={isSendingEmail || !emailInput.trim()}
            >
              {isSendingEmail ? "Sending..." : "Send Code"}
            </Button>
          </div>
        )}

        {(channel === "sms" || emailSent) && (
          <form onSubmit={handleVerify} className="mt-4 space-y-4">
            <div>
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={handleCodeChange}
                className={cn(
                  "text-center text-lg tracking-[0.4em]",
                  error && "border-red-500 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-200"
                )}
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <Button type="submit" variant="kiosk" className="h-auto w-full px-8 py-3.5 rounded-xl" size="lg" disabled={code.length !== 6 || isVerifying}>
              {isVerifying ? "Verifying..." : "Verify Code"}
            </Button>
            {channel === "sms" && onResend && (
              <p className="text-center text-xs text-slate-400">
                Didn&apos;t get a code?{" "}
                {cooldown > 0 ? (
                  <span>Resend available in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={onResend}
                    className="font-semibold text-emerald-600 underline-offset-2 hover:underline"
                  >
                    Resend Code
                  </button>
                )}
              </p>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
