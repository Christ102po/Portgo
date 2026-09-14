const jwt = require("jsonwebtoken");
const { normalizeIdentifier } = require("./otpStore");

const PURPOSE = "OTP_VERIFICATION";
const TOKEN_TTL = "15m";

function secret() {
  const value = String(process.env.JWT_SECRET || "").trim();
  if (!value) {
    throw new Error("JWT_SECRET is required to issue OTP verification tokens");
  }
  return value;
}

function issueOtpVerificationToken(identifier) {
  return jwt.sign(
    {
      purpose: PURPOSE,
      identifier: normalizeIdentifier(identifier),
    },
    secret(),
    { expiresIn: TOKEN_TTL }
  );
}

function verifyOtpVerificationToken(token, expectedIdentifier) {
  try {
    const payload = jwt.verify(String(token || ""), secret());
    if (payload?.purpose !== PURPOSE) {
      return { ok: false, message: "Invalid phone verification proof" };
    }

    const expected = normalizeIdentifier(expectedIdentifier);
    if (payload.identifier !== expected) {
      return { ok: false, message: "Phone verification does not match the registered contact number" };
    }

    return { ok: true, payload };
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return { ok: false, message: "Phone verification expired. Please verify the contact number again." };
    }
    return { ok: false, message: "Invalid or expired phone verification. Please verify the contact number again." };
  }
}

module.exports = {
  issueOtpVerificationToken,
  verifyOtpVerificationToken,
  TOKEN_TTL,
};
