# PORTGO Live SMS Verification Setup

PORTGO phone verification now uses **real SMS delivery through TextBee**. The old on-screen demo OTP and the universal `123456` bypass have been removed.

## What you need

1. A TextBee account.
2. An Android phone with an active SIM that can send SMS.
3. The TextBee Android gateway/device connected to your TextBee account and kept online.
4. A TextBee API key.

TextBee sends API requests from Railway to your registered Android phone, and that phone sends the SMS using its SIM. SMS recipients should be in E.164 form; PORTGO automatically converts Philippine `09XXXXXXXXX` numbers to `+639XXXXXXXXX`.

## Railway environment variables

Open **Railway -> PORTGO service -> Variables** and add:

```env
TEXTBEE_API_KEY=your_real_textbee_api_key
```

If you want to force PORTGO to use one specific registered phone/device, also add:

```env
TEXTBEE_DEVICE_ID=your_textbee_device_id
```

`TEXTBEE_DEVICE_ID` is optional. When it is omitted, TextBee uses the default or most recently active enabled device.

Never put your real API key in GitHub or in `backend/.env.example`.

## Deploy

After adding the variables, deploy/redeploy PORTGO on Railway. Then test with a real Philippine mobile number such as `09XX-XXX-XXXX`.

Expected flow:

1. Passenger enters a valid PH mobile number.
2. Passenger taps **Send Code**.
3. PORTGO generates a random 6-digit OTP valid for 5 minutes.
4. Railway calls TextBee.
5. Your registered Android phone sends the actual SMS.
6. Passenger enters the received code.
7. Verification succeeds only when the code matches.

## Security behavior

- No OTP is returned to the browser/API response.
- The old `123456` bypass is removed.
- A resend is limited to once every 60 seconds server-side.
- OTPs expire after 5 minutes.
- After 5 incorrect attempts, the OTP is invalidated and a new one must be requested.
- If SMS delivery fails, the OTP is deleted and verification cannot continue with a hidden/demo code.

## If SMS does not arrive

Check:

- `TEXTBEE_API_KEY` exists in Railway and is correct.
- The Android gateway phone is powered on and connected to the internet.
- TextBee has SMS permission on the Android phone.
- The SIM can send a normal SMS and has signal/load/plan as needed.
- The TextBee device is enabled/online in the dashboard.
- Railway deployment logs for `[OTP][SMS FAILED]` messages.

The current TextBee account-level endpoint used by PORTGO is:

`POST https://api.textbee.dev/api/v1/gateway/send-sms`
