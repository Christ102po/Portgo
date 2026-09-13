const otpStore = require("../lib/otpStore");
const { sendSms } = require("../lib/textbee");
const { sendMail } = require("../lib/mailer");
const { logAudit } = require("../lib/audit");

// Shared bypass code accepted on top of a real delivered code — useful for
// demos/testing when live SMS/email delivery isn't available or desired.
const DEMO_BYPASS_CODE = "123456";

async function send(req, res) {
  const { phone, channel = "sms" } = req.body;
  if (!phone || phone.trim().length < 4) {
    return res.status(400).json({ message: "A valid phone number or email address is required" });
  }

  const code = otpStore.setCode(phone);

  if (channel === "email") {
    const emailResult = await sendMail({
      to: phone, // for the email channel this field carries the address
      subject: `Your PORTGO verification code: ${code}`,
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

    if (emailResult.ok) {
      console.log(`[OTP] Email sent to ${phone} (${emailResult.messageId})`);
      await logAudit(req, "OTP_SENT", `Verification code sent via email to ${phone}`);
      // Real delivery succeeded — do NOT return devCode, so the on-screen
      // "Demo Verification Code" banner stays hidden. The passenger must use
      // the code from their inbox.
      return res.json({
        success: true,
        channel: "email",
        emailSent: true,
        expiresInSeconds: otpStore.OTP_TTL_MS / 1000,
        message: "Verification code sent to your email",
      });
    }

    // No SMTP configured (or send failed) — keep the code valid and hand it
    // back so the on-screen Demo Verification Code banner still works.
    console.error(`[OTP][EMAIL ${emailResult.simulated ? "SIMULATED" : "FAILED"}] ${phone}: ${emailResult.error}`);
    await logAudit(
      req,
      emailResult.simulated ? "OTP_SENT" : "OTP_SEND_FAILED",
      `Email code for ${phone} — ${emailResult.error}`
    );
    return res.json({
      success: true,
      channel: "email",
      emailSent: false,
      devCode: code,
      expiresInSeconds: otpStore.OTP_TTL_MS / 1000,
      message: emailResult.simulated
        ? "No live email provider configured — use the Demo Verification Code shown below."
        : "We couldn't send the email — use the Demo Verification Code shown below instead.",
    });
  }

  const message = `Your PORTGO Verification Code is: ${code}. Do not share this code.`;
  const smsResult = await sendSms(phone, message);

  if (smsResult.ok) {
    console.log(`[OTP] SMS sent to ${phone} via Textbee`);
    await logAudit(req, "OTP_SENT", `Verification code sent via SMS to ${phone}`);
    return res.json({
      success: true,
      channel: "sms",
      smsSent: true,
      devCode: code,
      expiresInSeconds: otpStore.OTP_TTL_MS / 1000,
      message: "Verification code sent via SMS",
    });
  }

  // Real SMS delivery failed (or Textbee isn't configured) — keep the code
  // valid in the store and hand it back to the client so the on-screen
  // Demo Verification Code banner still lets the passenger complete
  // verification without a working SMS gateway.
  console.error(`[OTP][SMS FAILED] ${phone}: ${smsResult.error}`);
  await logAudit(req, "OTP_SEND_FAILED", `SMS delivery failed for ${phone} — ${smsResult.error}`);
  res.json({
    success: true,
    channel: "sms",
    smsSent: false,
    devCode: code,
    expiresInSeconds: otpStore.OTP_TTL_MS / 1000,
    message: "We couldn't send the SMS to that number — use the Demo Verification Code shown below instead.",
  });
}

async function verify(req, res) {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ verified: false, message: "Phone/email and code are required" });
  }

  if (code === DEMO_BYPASS_CODE) {
    await logAudit(req, "OTP_VERIFIED", `${phone} verified using shared Demo Code`);
    return res.json({ verified: true });
  }

  const result = otpStore.verifyCode(phone, code);
  if (!result.ok) {
    await logAudit(req, "OTP_VERIFY_FAILED", `Failed OTP verification attempt for ${phone} — ${result.message}`);
    return res.status(400).json({ verified: false, message: result.message });
  }

  await logAudit(req, "OTP_VERIFIED", `${phone} successfully verified`);
  res.json({ verified: true });
}

module.exports = { send, verify };
