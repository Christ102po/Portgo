# PORTGO admin login recovery fix

This patch fixes the case where Railway has `SEED_ADMIN_PASSWORD`, but the admin login still says **Invalid credentials**.

## What was happening

`SEED_ADMIN_PASSWORD` was only read by `backend/src/seed.js`. Changing the Railway variable by itself did not update the password hash already stored in MySQL unless `npm run seed` was run against the same production database.

## What changed

- `admin@portgo.com` can now use the current `SEED_ADMIN_PASSWORD` as an emergency recovery credential.
- When that recovery credential is successfully used, PORTGO immediately re-hashes it with bcrypt and synchronizes the production `admins` table.
- If the seed admin is missing, PORTGO recreates it safely.
- If an older database has a `SUPER_ADMIN` under a different record id, PORTGO repairs that record instead of creating a duplicate.
- The seed script was made independent of the old hard-coded admin id.
- The seed script no longer prints the admin password in Railway logs.
- Accidental surrounding quotes in Railway values are ignored for `SEED_ADMIN_PASSWORD` and `JWT_SECRET`.

## Railway variables

Keep these on the PORTGO web service:

```env
SEED_ADMIN_EMAIL=admin@portgo.com
SEED_ADMIN_PASSWORD=YOUR_NEW_ADMIN_PASSWORD
JWT_SECRET=YOUR_LONG_RANDOM_JWT_SECRET
JWT_EXPIRES_IN=8h
```

`SEED_ADMIN_EMAIL` is optional. If omitted, PORTGO uses `admin@portgo.com`.

Do not put quotation marks around the values in Railway.

## After uploading this patch

1. Push the changed files to GitHub.
2. Wait for Railway to finish the new deployment.
3. Log in with:
   - Email: `admin@portgo.com`
   - Password: the exact current value of `SEED_ADMIN_PASSWORD`

You do **not** have to run the seed command just to recover the admin after this patch. On the first successful recovery login, the database password hash is synchronized automatically.

You may still run this if you want to force a database seed/reset manually:

```bash
railway run npm run seed
```
