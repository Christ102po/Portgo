const jwt = require("jsonwebtoken");
const { normalizeIdentifier } = require("./otpStore");

const TOKEN_TYPE = "phone-verification";
const TOKEN_TTL = process.env.PHONE_VERIFICATION_TOKEN_TTL || "30m";

function getSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret) throw new Error("JWT_SECRET is required for phone verification tokens");
  return secret;
}

function issuePhoneVerificationToken(phone) {
  const normalizedPhone = normalizeIdentifier(phone);
  return jwt.sign(
    {
      type: TOKEN_TYPE,
      phone: normalizedPhone,
    },
    getSecret(),
    {
      expiresIn: TOKEN_TTL,
      issuer: "portgo",
      audience: "portgo-registration",
    }
  );
}

function verifyPhoneVerificationToken(token, expectedPhone) {
  if (!token) return { ok: false, message: "Phone verification is required before registration." };

  try {
    const payload = jwt.verify(token, getSecret(), {
      issuer: "portgo",
      audience: "portgo-registration",
    });

    if (payload.type !== TOKEN_TYPE) {
      return { ok: false, message: "Invalid phone verification token." };
    }

    const expected = normalizeIdentifier(expectedPhone);
    if (!expectedPhone || payload.phone !== expected) {
      return { ok: false, message: "The verified phone number does not match this registration." };
    }

    return { ok: true, phone: expected, payload };
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return { ok: false, message: "Phone verification expired. Please verify the number again." };
    }
    return { ok: false, message: "Invalid phone verification. Please verify the number again." };
  }
}

module.exports = {
  issuePhoneVerificationToken,
  verifyPhoneVerificationToken,
};
