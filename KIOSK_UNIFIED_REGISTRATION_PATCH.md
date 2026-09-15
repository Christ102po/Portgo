# PORTGO Kiosk Unified Registration Update

This update changes the public PORTGO experience into a kiosk-first flow while preserving the existing admin, manifest, reporting, schedule, and gate-scanner functions.

## New kiosk home

Opening PORTGO at `/` now shows two large touch-friendly choices:

- **Scan Existing QR** — opens the public QR scanner at `/scan-pass` and displays the saved registration/travel information.
- **Register New Member** — opens the registration wizard at `/register`.

The screen is responsive for kiosk displays, desktop/laptop, tablets, and phones.

## Unified registration

The old **Register Myself** and **Register Group** choice has been removed. There is now one registration sequence.

The primary passenger follows the same six-step sequence as before. On Passenger Details, the user can optionally add accompanying members. If no members are added, the booking behaves like a normal single-passenger registration.

## One QR for the primary passenger

When accompanying members are added:

- Only the primary passenger receives the shared QR code.
- Accompanying members do not receive separate QR codes.
- Every accompanying member is still stored as a passenger/trip record, so they remain visible to admin records, manifests, counts, reports, and capacity calculations.
- Scanning the shared family/master QR at the protected gate scanner checks the whole registered party in together.
- After registration succeeds, the kiosk clears the temporary member-entry list so the next kiosk user cannot see the previous group's form data.

## Capacity handling

Schedule and accommodation availability now accounts for the full number of travelers (primary passenger + optional accompanying members) before submission.

## Database

No Prisma schema change or database migration is required. This update reuses the existing `FamilyBooking` and `Trip.familyBookingId` structure already in PORTGO.

## Deployment

Replace the patched files or use the full project ZIP, then push normally:

```powershell
git add .
git commit -m "Add kiosk home and unified passenger registration"
git push origin main
```

Railway can rebuild and redeploy the existing project normally.
