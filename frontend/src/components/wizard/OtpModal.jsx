import { useEffect, useState } from "react";
import { ShieldCheck, MessageSquareText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";
import { cn } from "../../lib/cn";

const INVALID_CODE_MESSAGE = "Invalid verification code. Please check the code sent to your phone and try again.";

export function OtpModal({ open, onOpenChange, phone, onVerified, cooldown = 0, onResend }) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setCode("");
      setError("");
    }
  }, [open, phone]);

  function handleCodeChange(e) {
    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
    if (error) setError("");
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsVerifying(true);
    setError("");
    try {
      const res = await apiClient.post("/otp/verify", { phone, code });
      if (res.data.verified && res.data.verificationToken) {
        showToast({
          title: "Phone number verified",
          description: "This number is confirmed for your registration.",
          variant: "success",
        });
        onVerified({
          verificationToken: res.data.verificationToken,
          phone: res.data.phone || phone,
        });
        onOpenChange(false);
      } else {
        setError(INVALID_CODE_MESSAGE);
      }
    } catch (err) {
      setError(err.response?.data?.message || INVALID_CODE_MESSAGE);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (!onResend || cooldown > 0 || isResending) return;
    setIsResending(true);
    setCode("");
    setError("");
    try {
      await onResend();
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
        </div>
        <DialogTitle className="text-center">Enter Verification Code</DialogTitle>
        <DialogDescription className="text-center">
          A 6-digit OTP was sent by SMS to <span className="font-semibold text-ink">{phone}</span>.
        </DialogDescription>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
          <MessageSquareText className="h-4 w-4 text-emerald-600" />
          SMS phone verification only
        </div>

        <form onSubmit={handleVerify} className="mt-5 space-y-4">
          <div>
            <Input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              className={cn(
                "h-14 text-center text-2xl font-bold tracking-[0.45em] tabular-nums",
                error && "border-red-500 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-200"
              )}
            />
            {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
          </div>

          <Button
            type="submit"
            variant="kiosk"
            className="h-auto w-full rounded-xl px-8 py-3.5"
            size="lg"
            disabled={code.length !== 6 || isVerifying}
          >
            {isVerifying ? "Verifying..." : "Verify Phone Number"}
          </Button>

          {onResend && (
            <p className="text-center text-xs text-slate-400">
              Didn&apos;t receive the code?{" "}
              {cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-semibold text-emerald-600 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  {isResending ? "Sending..." : "Send a new code"}
                </button>
              )}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
