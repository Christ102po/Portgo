# PORTGO Admin Dashboard — Clickable Totals Patch

Updated the Admin Dashboard total/stat cards so each card acts as an accessible button.

## Behavior
- Total Passengers Today → shows today's passenger trip records.
- Today's Total Sign-In → shows today's departing passengers (Surigao → Dapa).
- Today's Total Sign-Out → shows today's arriving passengers (Dapa → Surigao).
- Locals vs Tourists Verified → shows today's local passengers plus foreign tourists who completed passport + face verification.
- Boarded Today → shows today's boarded passengers.
- Cancelled Today → shows today's cancelled bookings.
- No-Shows Today → shows today's no-show passengers.

## UI
- Clicking a stat card opens a responsive details dialog without leaving the dashboard.
- Desktop/tablet: details are shown in a scrollable table.
- Mobile: details are shown as stacked cards.
- Cards include a small "View details" indicator and keyboard focus styling.
- The dialog shows the matching total and, for Local vs Tourist, separate Local and Verified Tourist counts.
- Up to 200 of the newest matching records are displayed per detail view.

## Database
No Prisma schema or database migration is required.
