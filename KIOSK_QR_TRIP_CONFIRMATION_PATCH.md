# PORTGO Kiosk QR Trip Confirmation Update

After an existing PORTGO QR is scanned, the kiosk now asks the passenger to confirm the trip they are taking now before recording the movement.

## New scan flow

1. Scan existing QR / enter pass code.
2. PORTGO loads the registered passenger or group.
3. Passenger selects **Outbound / Departing** or **Inbound / Arriving**.
4. Passenger selects the ship actually boarded.
5. Accommodation choices are based on the selected ship:
   - Economy-only ship: Economy is selected automatically.
   - Ship with configured accommodation types: only those configured types are shown.
6. PORTGO automatically matches the selection to the closest **active** admin schedule for that vessel and direction.
7. The trip is recorded using the backend server's current timestamp. The kiosk displays the current time in **Asia/Manila (PHT)** and re-synchronizes with the server.

## Group QR behavior

A leader/master QR still represents the registered group. The selected trip details are recorded for all unique registered travelers linked to that QR. Accompanying members are not issued separate QR codes.

## Record behavior

If the passenger still has an ACTIVE planned trip, PORTGO updates that planned trip into the actual boarded movement and moves its trip timestamp to the scan time. If there is no ACTIVE planned trip, a new trip history row is created for the already-registered passenger profile. This allows the same registered QR to identify the passenger on later trips without re-registering personal details.

A duplicate-scan guard rejects the same passenger/group, vessel, sailing, and direction when it was already recorded in the previous 5 minutes.

## Database

No Prisma schema/database migration is required for this patch. It uses the existing Passenger, Trip, FamilyBooking, Ship, ShipClass, and Schedule tables.
