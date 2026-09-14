# PORTGO — Semaphore OTP, Railway, Group Verification & Mobile Setup

## What this updated copy does

- Uses Semaphore API v4 for SMS and OTP delivery.
- Individual passenger SMS OTP remains available.
- Group / dependent registration now requires the **Primary Contact / Head of Group phone number to be verified by SMS OTP** before continuing.
- A successful OTP verification now returns a short-lived, signed verification proof. The family/group booking API rejects a booking if that proof is missing, expired, or belongs to a different phone number.
- Group bookings must be submitted online because the OTP proof is time-limited.
- Main kiosk pages allow normal vertical touch scrolling and group traveler fields stack cleanly on small phones.
- The existing manifest + service worker allow PORTGO to be installed as a PWA from the Railway HTTPS URL.

## Semaphore variables on Railway

Open Railway -> your PORTGO web service -> Variables and add:

```env
SEMAPHORE_API_KEY=your_real_semaphore_api_key
```

If you have an approved Sender Name, also add:

```env
SEMAPHORE_SENDER_NAME=PORTGO
```

PORTGO also needs the existing auth secret because the updated group verification proof is signed server-side:

```env
JWT_SECRET=use_a_long_random_secret_here
```

Do not put these real values in GitHub.

After editing Variables, deploy the staged changes / redeploy the service.

## Recommended production variables

Typical Railway web-service variables:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
NODE_ENV=production
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=8h
SEED_ADMIN_PASSWORD=YOUR_ADMIN_SEED_PASSWORD
PUBLIC_APP_URL=https://YOUR-RAILWAY-DOMAIN
CORS_ORIGIN=https://YOUR-RAILWAY-DOMAIN
PORT_NAME=Surigao
SEMAPHORE_API_KEY=YOUR_SEMAPHORE_API_KEY
SEMAPHORE_SENDER_NAME=PORTGO
```

Use the actual Railway MySQL service name if yours is not named `MySQL`.

## Test Semaphore OTP after deployment

1. Open the deployed PORTGO site.
2. Start an individual local passenger registration or a group registration.
3. Enter a valid Philippine mobile number.
4. Press **Send Code / Send OTP**.
5. Enter the received 6-digit code.
6. For group registration, confirm the page displays **Primary contact phone verified by SMS** and then continue.

If sending fails, inspect Railway -> Deployments -> latest deployment -> Logs. Search for:

```text
[OTP][SMS FAILED]
```

Common causes include a missing/invalid API key, no usable Sender Name, an unapproved configured Sender Name, insufficient credits, or an invalid phone number.

## Install PORTGO as a mobile app (PWA)

Because PORTGO is already a Progressive Web App, no APK is required for normal phone use.

### Android / Chrome

1. Open `https://YOUR-RAILWAY-DOMAIN` in Chrome.
2. Open the Chrome menu.
3. Choose **Install app** or **Add to Home screen**.
4. Open PORTGO from the new home-screen icon.

### iPhone / Safari

1. Open the Railway HTTPS URL in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Launch PORTGO from the new icon.

SMS OTP, booking, database, admin data, and live API operations still require internet access.

## If you specifically need an Android APK later

The clean next step is to wrap the Vite frontend using Capacitor. Do this only after the Railway URL and OTP are working. A native wrapper needs its API base URL pointed to the Railway HTTPS domain instead of relying on the browser's relative `/api` path.

