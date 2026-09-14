# PORTGO Email OTP setup for Railway

PORTGO supports two verification methods for both individual and group registration:

- **SMS** — Semaphore OTP
- **Email** — 6-digit email OTP

The code is sent automatically after a valid phone number or email address is completed. There is no separate **Send OTP** button.

## Important Railway note

Railway currently allows outbound SMTP only on the **Pro plan and above**. Free, Trial, and Hobby deployments should use an HTTPS email API instead.

This PORTGO build therefore supports three email transports:

1. **Gmail API over HTTPS** — recommended if you want to send from your Gmail account and use Railway Free/Trial/Hobby.
2. **Resend HTTPS API** — simple alternative that also works on all Railway plans.
3. **Gmail/other SMTP** — works locally and on Railway Pro+.

Set `EMAIL_PROVIDER=auto` and PORTGO will prefer Gmail API, then Resend, then SMTP. You can also force `gmail_api`, `resend`, or `smtp`.

---

## Option A — Gmail API (best if you specifically want Gmail on Railway)

This uses HTTPS instead of SMTP, so Railway's SMTP restriction does not apply.

### Google setup

1. Open Google Cloud Console and create/select a project.
2. Enable **Gmail API**.
3. Configure the OAuth consent screen.
4. Create an **OAuth 2.0 Client ID**.
5. Authorize the Gmail account that PORTGO will send from with the scope:

```text
https://www.googleapis.com/auth/gmail.send
```

6. Obtain a refresh token for that Gmail account. The refresh token must be created with offline access.

For a small capstone/test setup, Google OAuth Playground can be used to authorize the Gmail account and obtain the refresh token. If you use your own OAuth client in OAuth Playground, add this redirect URI to the Google OAuth client:

```text
https://developers.google.com/oauthplayground
```

### Railway variables

In **Railway -> PORTGO service -> Variables**, add:

```env
EMAIL_PROVIDER=gmail_api
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_google_refresh_token
GMAIL_USER=your-email@gmail.com
MAIL_FROM=PORTGO <your-email@gmail.com>
```

Do not put these secrets in GitHub or `frontend/.env`.

Redeploy. A successful startup check should show something similar to:

```text
[MAIL] Gmail API ready over HTTPS for your-email@gmail.com
```

When an OTP is sent successfully:

```text
[MAIL] sent to passenger@example.com via Gmail API (...)
[OTP] Email sent to passenger@example.com (...)
```

---

## Option B — Resend API

Add:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_key_here
MAIL_FROM=PORTGO <verify@your-verified-domain.com>
```

Then redeploy. For sending to arbitrary passengers, use a sender/domain allowed by your Resend account.

---

## Option C — Gmail SMTP (Railway Pro+ only)

Gmail SMTP itself does not require a separate paid Gmail API service, but Railway blocks outbound SMTP on Free, Trial, and Hobby plans.

For Railway Pro+ or local development:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-google-app-password
MAIL_FROM=PORTGO <your-email@gmail.com>
```

For Gmail, `SMTP_PASS` must be a Google **App Password**, not your normal Gmail password. Enable 2-Step Verification on the Google account first.

After redeploying, look for:

```text
[MAIL] SMTP ready via smtp.gmail.com:587
```

---

## Database update

The email-verification feature allows a group booking to use email without a phone number, so `FamilyBooking.headContact` is nullable in the current Prisma schema.

From the project root:

```powershell
railway run npm run db:push
```

Then redeploy the PORTGO service.

## Verification behavior

- SMS selected -> valid Philippine mobile number -> OTP automatically sends through Semaphore.
- Email selected -> valid email address -> OTP automatically sends through the configured email provider.
- The OTP expires after 5 minutes.
- Resending uses the existing 60-second cooldown.
- The backend removes the generated OTP if delivery fails, so a failed email/SMS does not leave an unseen valid OTP active.
