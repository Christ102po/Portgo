# PORTGO Group Registration Fix

Fixed the email-verified group registration error:

`Null constraint violation on the fields: (headContact)`

## Cause

Older deployed MySQL databases created `family_bookings.headContact` as NOT NULL. Email-verified groups do not have to provide a phone number, so Prisma attempted to save a null value and the live Railway database rejected it.

## Fix included

- PORTGO checks the live database during backend startup.
- If `family_bookings.headContact` is still NOT NULL, it is changed to nullable without deleting existing records.
- If the column is missing, PORTGO adds it as nullable.
- Group creation also has a safe empty-string fallback for legacy databases where ALTER TABLE is temporarily unavailable.
- SMS-verified group behavior is unchanged.
- Email-verified groups can now complete confirmation without requiring a phone number.
