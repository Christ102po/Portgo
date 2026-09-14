const otpStore = require("../lib/otpStore");
const { sendOtpSms, normalizePhoneForSemaphore } = require("../lib/semaphore");
const { sendMail } = require("../lib/mailer");
const { logAudit } = require("../lib/audit");
const { issueOtpVerificationToken } = require("../lib/otpVerificationToken");

async function send(req, res) {
  const { phone, channel = "sms" } = req.body;
  if (!phone || phone.trim().length < 4) {
    return res.status(400).json({ message: "A valid phone number or email address is required" });
  }

  const otp = otpStore.setCode(phone);
  if (!otp.ok) {
    return res.status(429).json({
      message: `Please wait ${otp.retryAfterSeconds} seconds before requesting another code.`,
      retryAfterSeconds: otp.retryAfterSeconds,
    });
  }

  const code = otp.code;

  if (channel === "email") {
    const emailResult = await sendMail({
      to: phone,
      subject: "Your PORTGO verification code",
      text:
        `Your PORTGO verification code is: ${code}\n\n` +
        `This code expires in ${Math.round(otpStore.OTP_TTL_MS / 60000)} minutes. ` +
        `Do not share it with anyone.`,
      html:
        `<p style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;color:#0f172a;">` +
        `Your PORTGO verification code is:</p>` +
        `<p style="font-family:Segoe UI,Arial,sans-serif;font-size:30px;font-weight:700;letter-spacing:6px;color:#0f766e;">${code}</p>` +
        `<p style="font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#64748b;">` +
        `Expires in ${Math.round(otpStore.OTP_TTL_MS / 60000)} minutes. Do not share this code.</p>`,
    });

    if (!emailResult.ok) {
      otpStore.clearCode(phone);
      console.error(`[OTP][EMAIL FAILED] ${phone}: ${emailResult.error}`);
      await logAudit(req, "OTP_SEND_FAILED", `Email delivery failed for ${phone} — ${emailResult.error}`);
      return res.status(502).json({
        success: false,
        channel: "email",
        message: "We couldn't send the verification email. Please try again or use SMS.",
      });
    }

    console.log(`[OTP] Email sent to ${phone} (${emailResult.messageId})`);
    await logAudit(req, "OTP_SENT", `Verification code sent via email to ${phone}`);
    return res.json({
      success: true,
      channel: "email",
      emailSent: true,
      expiresInSeconds: otpStore.OTP_TTL_MS / 1000,
      message: "Verification code sent to your email",
    });
  }

  const minutesValid = Math.round(otpStore.OTP_TTL_MS / 60000);
  const smsResult = await sendOtpSms(phone, code, minutesValid);

  if (!smsResult.ok) {
    // Never expose an OTP when live delivery fails. Remove it so there is no
    // hidden valid code that a passenger could guess or obtain from a response.
    otpStore.clearCode(phone);
    console.error(`[OTP][SMS FAILED] ${phone}: ${smsResult.error}`);
    await logAudit(req, "OTP_SEND_FAILED", `SMS delivery failed for ${phone} — ${smsResult.error}`);
    return res.status(502).json({
      success: false,
      channel: "sms",
      smsSent: false,
      message:
        smsResult.userMessage ||
        "We couldn't send the SMS. Please check the number and SMS service configuration, then try again.",
    });
  }

  const normalizedPhone = normalizePhoneForSemaphore(phone);
  console.log(`[OTP] SMS accepted for ${normalizedPhone} via Semaphore${smsResult.messageId ? ` (${smsResult.messageId})` : ""}`);
  await logAudit(req, "OTP_SENT", `Verification code sent via SMS to ${normalizedPhone}`);

  return res.json({
    success: true,
    channel: "sms",
    smsSent: true,
    expiresInSeconds: otpStore.OTP_TTL_MS / 1000,
    message: "Verification code sent via SMS",
  });
}

async function verify(req, res) {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ verified: false, message: "Phone/email and code are required" });
  }

  const result = otpStore.verifyCode(phone, code);
  if (!result.ok) {
    await logAudit(req, "OTP_VERIFY_FAILED", `Failed OTP verification attempt for ${phone} — ${result.message}`);
    return res.status(400).json({ verified: false, message: result.message });
  }

  await logAudit(req, "OTP_VERIFIED", `${phone} successfully verified`);
  const verificationToken = issueOtpVerificationToken(phone);
  return res.json({
    verified: true,
    verificationToken,
    message: "Phone number verified",
  });
}

module.exports = { send, verify };
