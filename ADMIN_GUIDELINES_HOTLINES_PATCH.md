# PORTGO Admin Guidelines & Hotlines Update

## Changes
- Removed **Vehicles & Cargo** from the Admin > Port Operations menu.
- Removed **Barangay Masterlist** from the Admin navigation and removed the Barangay CSV import controls from the Admin Dashboard.
- Existing vehicle/passenger history is preserved for manifests and reports; this update does not delete historical database records.
- Added **Guidelines & Hotlines** under **System & Reports**.
- Admin/Super Admin can add, edit, hide/publish, reorder, and delete:
  - Passenger Reminders
  - Prohibited Items
  - Priority Lane & Assistance rules
  - Emergency hotline names and phone numbers
- The kiosk **Port Guidelines & Safety Rules** modal now loads only the active information published by Admin.
- Hard-coded passenger guidelines and placeholder hotline numbers were removed from the kiosk UI.

## Database update required
Run once after deploying/replacing the files:

```powershell
railway run npm run db:push
```

Alternatively, import `port_information_migration.sql` into the same MySQL database.

After the database update, open:
**Admin > System & Reports > Guidelines & Hotlines**
and add the rules/hotlines you want passengers to see.
