# PORTGO Deployment Guide

This copy is prepared for a **single Railway web service + Railway MySQL**. The Express backend serves the built React app, so users only need one HTTPS URL and the installed PWA uses that same API/domain.

## 1. Before uploading to GitHub

Do **not** upload the real `backend/.env` or `frontend/.env`. They are already ignored by `.gitignore`. Use the `.env.example` files only as references.

Recommended repository layout:

- `package.json` (root deployment scripts)
- `railway.json`
- `frontend/`
- `backend/`
- `portgo.sql` (optional database backup/import)

`node_modules/`, `.git/`, `.vite/`, and build output are not needed in the repository/deployment upload.

## 2. Create a Railway project

1. Create a new Railway project.
2. Add a **MySQL** database service.
3. Add a new service from your PORTGO GitHub repository.
4. Keep the service root at the repository root (where the new root `package.json` is located).
5. Railway will use `railway.json`, run `npm run build`, then `npm start`.

## 3. Backend variables

In the PORTGO web service → **Variables**, add:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
NODE_ENV=production
JWT_SECRET=PUT_A_LONG_RANDOM_SECRET_HERE
JWT_EXPIRES_IN=8h
SEED_ADMIN_PASSWORD=CHOOSE_A_STRONG_TEMPORARY_PASSWORD
PORT_NAME=Surigao
```

If your database service is not literally named `MySQL`, use its actual Railway service name in the reference.

Optional integrations can then be added from `backend/.env.example`: OneSignal OTP, OpenWeather and SMTP.

Do not manually set Railway's `PORT` unless you have a reason; the server reads Railway's provided port automatically.

## 4. Create the database tables

For a clean deployment, open a terminal in the repository after installing/linking the Railway CLI and run:

```bash
railway run --service <your-web-service-name> npm run db:push
railway run --service <your-web-service-name> npm run seed
```

This creates the Prisma schema in Railway MySQL and seeds the app's demo/default records. The seeded super-admin email is `admin@portgo.com` and its password is the `SEED_ADMIN_PASSWORD` value you set. Change that account password in the system after first login if your workflow supports it, and do not reuse the seed password elsewhere.

If you specifically need the exact records from the included `portgo.sql`, import that SQL dump into the Railway MySQL database instead of running the seed step. Do not run both imports blindly, because duplicate records can conflict.

## 5. Generate a public HTTPS domain

In the PORTGO web service → **Settings → Networking**, generate a Railway public domain.

Test:

- `https://YOUR-DOMAIN/api/health` → should return `{"status":"ok"}`
- `https://YOUR-DOMAIN/` → PORTGO kiosk
- `https://YOUR-DOMAIN/admin/login` → admin login

Then set these variables on the web service and redeploy:

```env
PUBLIC_APP_URL=https://YOUR-DOMAIN
CORS_ORIGIN=https://YOUR-DOMAIN
```

If you later use a custom domain, replace both with the custom HTTPS URL.

## 6. Install it as a mobile app (PWA)

PORTGO now includes a web manifest, 192/512 icons and a service worker.

### Android / Chrome

1. Open the HTTPS PORTGO URL in Chrome.
2. Tap the browser menu.
3. Choose **Install app** or **Add to Home screen**.
4. Launch PORTGO from the new app icon.

### iPhone / Safari

1. Open the HTTPS PORTGO URL in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Open PORTGO from the Home Screen.

The PWA shell can reopen when connectivity is interrupted, but live booking, database, OTP, admin, manifest and other API operations still require internet access.

## 7. Local testing before deployment

Use two terminals:

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

On the development PC use `http://localhost:5173`. On another phone on the same Wi-Fi use `http://YOUR-PC-LAN-IP:5173`. The frontend automatically points to port 4000 during local/LAN development.

## 8. Production checks

After deployment, verify at minimum:

- kiosk registration/booking flow
- admin login and protected roles
- passenger records
- ships and schedules
- ticketing/boarding
- QR scanner (camera permission requires HTTPS)
- email/SMS OTP if configured
- generated manifest/PDF downloads
- PWA installation on Android/iPhone
- mobile layout on a real phone

## Security note

Never commit `.env` files, database passwords, SMTP app passwords, SMS API keys or JWT secrets to GitHub. If any real secret was previously shared or committed, rotate it before production deployment.
