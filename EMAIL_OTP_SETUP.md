# PORTGO Email OTP setup (Railway)

PORTGO now supports two verification methods for individual and group registration:

- **SMS** — Semaphore OTP
- **Email** — SMTP email OTP

Both methods send the 6-digit code automatically after the user finishes entering a valid phone number or email address. There is no separate **Send OTP** button.

## 1. Add SMTP variables in Railway

Open **Railway → Portgo service → Variables** and add:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
MAIL_FROM=PORTGO <your-email@gmail.com>
```

For Gmail, `SMTP_PASS` must be a Google **App Password**, not the normal Gmail password. Your Google account must have 2-Step Verification enabled before you can create an App Password.

You can also use another SMTP provider. Replace the host, port, username, password, and sender address with the values supplied by that provider.

## 2. Redeploy

After adding/changing Railway variables, redeploy the Portgo service. In the deployment logs you should see:

```text
[MAIL] SMTP ready via smtp.gmail.com:587
```

If you see:

```text
[MAIL] No SMTP configured
```

then one or more of `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS` is missing.

## 3. Update the database schema

This patch lets a group booking have no phone number when email verification is used, so `FamilyBooking.headContact` is now nullable.

Run from the project root after setting the Railway environment / database connection:

```powershell
railway run npm run db:push
```

Then deploy the application normally.

## Verification behavior

- SMS selected → type a valid Philippine mobile number → OTP is sent automatically through Semaphore.
- Email selected → type a valid email address → OTP is sent automatically through SMTP.
- A verified email is locked on the next personal-information screen so the passenger cannot replace it with an unverified address.
- Group/dependent registration supports the same SMS-or-email choice for the primary contact.
- OTPs expire after 5 minutes and resend uses the existing 60-second cooldown.
