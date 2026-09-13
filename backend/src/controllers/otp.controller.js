const otpStore = require("../lib/otpStore");
const { sendOtpSms, normalizePhoneE164 } = require("../lib/oneSignalOtp");
const { issuePhoneVerificationToken } = require("../lib/phoneVerificationToken");
const { logAudit } = require("../lib/audit");

async function send(req, res) {
  const { phone } = req.body;
  if (!phone || phone.trim().length < 4) {
    return res.status(400).json({ message: "A valid phone number is required" });
  }

  const otp = otpStore.setCode(phone);
  if (!otp.ok) {
    return res.status(429).json({
      message: `Please wait ${otp.retryAfterSeconds} seconds before requesting another code.`,
      retryAfterSeconds: otp.retryAfterSeconds,
    });
  }

  const minutesValid = Math.round(otpStore.OTP_TTL_MS / 60000);
  const smsResult = await sendOtpSms(phone, otp.code, minutesValid);

  if (!smsResult.ok) {
    // Never leave a valid OTP behind if the provider did not accept the SMS.
    otpStore.clearCode(phone);
    console.error(`[OTP][ONESIGNAL FAILED] ${phone}: ${smsResult.error}`);
    await logAudit(req, "OTP_SEND_FAILED", `OneSignal OTP delivery failed for ${phone} — ${smsResult.error}`);
    return res.status(smsResult.status >= 400 && smsResult.status < 500 ? 400 : 502).json({
      success: false,
      smsSent: false,
      message: "We couldn't send the verification code. Please check the phone number and OneSignal SMS setup, then try again.",
    });
  }

  const normalizedPhone = normalizePhoneE164(phone);
  console.log(
    `[OTP] OneSignal accepted verification SMS for ${normalizedPhone}${smsResult.messageId ? ` (${smsResult.messageId})` : ""}`
  );
  await logAudit(req, "OTP_SENT", `Verification code sent via OneSignal SMS to ${normalizedPhone}`);

  return res.json({
    success: true,
    smsSent: true,
    expiresInSeconds: otpStore.OTP_TTL_MS / 1000,
    message: "Verification code sent to your phone",
  });
}

async function verify(req, res) {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ verified: false, message: "Phone number and code are required" });
  }

  const result = otpStore.verifyCode(phone, code);
  if (!result.ok) {
    await logAudit(req, "OTP_VERIFY_FAILED", `Failed OTP verification attempt for ${phone} — ${result.message}`);
    return res.status(400).json({ verified: false, message: result.message });
  }

  const verificationToken = issuePhoneVerificationToken(phone);
  const normalizedPhone = normalizePhoneE164(phone);
  await logAudit(req, "OTP_VERIFIED", `${normalizedPhone || phone} successfully verified by OTP`);

  return res.json({
    verified: true,
    verificationToken,
    phone: normalizedPhone || phone,
  });
}

module.exports = { send, verify };
