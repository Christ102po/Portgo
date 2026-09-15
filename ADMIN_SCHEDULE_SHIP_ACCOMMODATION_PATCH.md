# PORTGO Admin Schedule + Ship Accommodation Update

## Schedule availability control
- Admin can mark each schedule **Available** or **Unavailable** with a switch.
- Only schedules with `active=true` and a bookable operational status (`ACTIVE` or `DELAYED`) appear in passenger registration.
- The backend also rejects direct booking attempts against an unavailable schedule.
- Schedule create/edit dialogs include an **Available to passengers** control.
- Added Available and Unavailable filters in Admin > Schedules.

## Schedule edit and delete
- Existing schedule edit remains available.
- The trash action now performs a real permanent delete for an unused schedule.
- A schedule that already has passenger/trip records is protected from deletion so historical records are not damaged. Set it to **Unavailable** instead.

## Ship accommodation setup
- Add/Edit Ship now has two modes:
  - **Economy only** — no accommodation picker is shown to passengers; the full ship capacity is Economy seating.
  - **Has accommodation types** — admin selects only the actual classes offered by the ship and sets seat capacities for each.
- Supported configured types remain Economy, Tourist Aircon, and Business.
- Class capacities cannot exceed the ship's total passenger capacity.
- Ships API now returns its configured classes plus `hasAccommodationTypes` / `accommodationMode` convenience fields.

## Passenger registration behavior
- Economy-only vessel: PORTGO automatically selects Economy and shows a simple Economy seating notice instead of class choices.
- Vessel with configured accommodation types: only those configured types appear.
- Backend validates the selected accommodation type against the chosen vessel, preventing hidden/unsupported class submissions.
- Backend also validates that the selected schedule belongs to the selected ship and is currently active.

## Database
No Prisma schema migration is required. Existing `ShipClass` rows are used as the configuration:
- no `ShipClass` rows = Economy-only vessel
- one or more `ShipClass` rows = configured accommodation types

Existing ships that currently have no class rows will behave as Economy-only until the admin configures accommodation types.
