# PORTGO phone verification — OneSignal OTP only

This PORTGO build uses **OneSignal only to deliver a one-time SMS verification code**. It does not use OneSignal for announcements, marketing, booking confirmations, or push notifications.

The passenger flow is:

1. Passenger enters a Philippine mobile number.
2. PORTGO generates a random 6-digit OTP on the backend.
3. PORTGO sends that OTP through OneSignal's SMS API.
4. The passenger enters the code received on the phone.
5. PORTGO verifies the code and issues a short-lived signed phone-verification token.
6. Registration is accepted only when that signed token matches the contact number being submitted.

This means simply changing `isPhoneVerified` in the browser is not enough to bypass verification.

## 1. OneSignal account requirements

You need a OneSignal app with **SMS enabled/configured**. Creating a normal OneSignal app or enabling web push alone is not enough for SMS delivery.

In the OneSignal dashboard, locate:

- **App ID**
- **App API Key** under Settings > Keys & IDs
- your SMS sender configuration, if OneSignal requires a sender value for your account

Do not put the API key in frontend code or commit it to GitHub.

## 2. Railway variables

Open Railway > PORTGO service > Variables and add:

```env
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_API_KEY=your_onesignal_app_api_key
PHONE_VERIFICATION_TOKEN_TTL=30m
```

Only if your OneSignal SMS setup requires it, also add:

```env
ONESIGNAL_SMS_FROM=your_configured_sms_sender
```

Keep your existing `JWT_SECRET`; PORTGO uses it to sign the proof that a phone number was successfully verified.

After saving Railway variables, let Railway redeploy the service.

## 3. What PORTGO sends

The SMS is intentionally limited to phone verification, for example:

```text
Your PORTGO verification code is 482913. It expires in 5 minutes. Do not share this code.
```

No OTP is returned to the browser or shown as a demo code.

## 4. Security behavior

- 6-digit cryptographically random code
- 5-minute OTP expiry
- 60-second resend cooldown
- maximum 5 incorrect attempts
- successful codes are invalidated immediately
- failed SMS sends delete the pending OTP
- registration receives a signed verification token only after a correct OTP
- the backend checks that the token belongs to the exact contact number being registered
- changing the phone field in the wizard clears the previous verification proof

## 5. Testing

After Railway deploys, use a real Philippine mobile number such as:

```text
0917-123-4567
```

PORTGO normalizes it to E.164 format:

```text
+639171234567
```

Tap **Send OTP**, receive the SMS, enter the 6-digit code, then continue registration.

If delivery fails, open Railway > Deployments > latest deployment > Logs and look for:

```text
[OTP][ONESIGNAL FAILED]
```

The line after it contains the OneSignal HTTP error/status but never prints your API key.

## 6. Important limitation

OneSignal must have SMS sending enabled for the app/account. OneSignal web-push credentials alone cannot send an SMS. Real carrier SMS delivery can also require sender setup and paid SMS access depending on the OneSignal account.
