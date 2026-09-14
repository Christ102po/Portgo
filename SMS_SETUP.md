# PORTGO real SMS OTP setup — Semaphore

PORTGO now uses **Semaphore's Philippine SMS API** for phone verification and other outbound SMS. It does **not** require an Android gateway app, an extra phone, or SMS permissions.

## 1. Create a Semaphore account

Create/sign in to your Semaphore account and copy the API key from the Semaphore dashboard.

PORTGO uses Semaphore's official API v4 endpoints:

- OTP: `POST https://api.semaphore.co/api/v4/otp`
- Normal SMS: `POST https://api.semaphore.co/api/v4/messages`

The OTP route is used only for verification codes. PORTGO supplies its own 6-digit OTP to Semaphore so the code stored by PORTGO is exactly the code sent by SMS.

## 2. Configure a Sender Name

Semaphore requires a registered Sender Name. In your Semaphore account, create a Sender Name such as `PORTGO` and wait for it to be approved.

If your account already has a registered/default Sender Name, `SEMAPHORE_SENDER_NAME` can be left blank. If you want PORTGO to request a specific approved Sender Name, set it in Railway.

## 3. Add Railway variables

Go to **Railway → PORTGO service → Variables** and add:

```env
SEMAPHORE_API_KEY=your_real_semaphore_api_key
```

Recommended (and required if your account does not already have a registered/default Sender Name):

```env
SEMAPHORE_SENDER_NAME=PORTGO
```

The value must exactly match an **active/approved** Sender Name in Semaphore.

Do **not** put the real API key in GitHub or commit it to an `.env` file.

Remove old TextBee variables if they still exist; PORTGO no longer reads them:

```text
TEXTBEE_API_KEY
TEXTBEE_DEVICE_ID
```

Paste Railway values without wrapping quotes. After changing Railway variables, deploy/redeploy the newest commit.

On startup, the updated backend checks the Semaphore account and Sender Name without sending an SMS. In Railway logs, look for either `[Semaphore] Connected...` or `[Semaphore] Configuration problem...`.

## 4. Phone-number handling

PORTGO accepts Philippine numbers in common local formats such as:

```text
09171234567
+639171234567
639171234567
```

and normalizes them to the format Semaphore accepts:

```text
639171234567
```

## 5. OTP security behavior

- 6-digit random OTP
- 5-minute expiration
- 60-second resend cooldown
- maximum 5 incorrect verification attempts
- no OTP returned to the browser
- no universal `123456` bypass
- failed SMS delivery clears the pending OTP

## 6. Testing

After deploying, enter a valid Philippine mobile number and press **Send Code**.

If it fails, open **Railway → Deployments → latest deployment → Logs** and look for:

```text
[OTP][SMS FAILED]
```

The log will include Semaphore's HTTP status/error without exposing the API key.

Common causes are:

- `SEMAPHORE_API_KEY` is missing or invalid
- no registered/default Sender Name exists
- the configured Sender Name is not approved
- insufficient Semaphore SMS credits
- invalid recipient number
- carrier/network rejection

## 7. Important Semaphore behavior

Do not start test messages with the word `TEST`; Semaphore documents that messages beginning with that word may be silently ignored. PORTGO's verification messages begin with `PORTGO`, so the built-in OTP message avoids this issue.

## 8. Group / dependent verification in this updated copy

The group registration form now sends OTP to the **Primary Contact / Head of Group** phone. The group cannot continue until that SMS OTP is verified.

After a correct OTP, the backend returns a short-lived signed verification proof. `/api/family-bookings` checks that proof against the submitted head contact, so simply changing browser form state is not enough to bypass verification. `JWT_SECRET` must therefore be configured in Railway (it is already required by PORTGO admin authentication).

Because that proof is time-limited, group bookings must be submitted while online.
