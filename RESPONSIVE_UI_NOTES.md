# PORTGO Responsive UI Update

This build keeps the existing application logic and adds responsive behavior across the passenger, admin, scanner, and live departure-board interfaces.

Key UI changes:
- Dynamic viewport-height support (`100dvh`) and horizontal-overflow protection.
- Passenger kiosk headers and status controls adapt to very narrow phones.
- Passenger wizard uses wider desktop space while remaining single-column on small screens.
- Admin dashboard now has a mobile slide-out navigation drawer instead of a permanently fixed desktop sidebar.
- Admin top-bar actions remain accessible through a horizontally scrollable mobile toolbar.
- Admin page padding scales for phone, tablet, laptop, and desktop screens.
- Dialogs are viewport-safe and scroll internally on short screens.
- Two-column forms stack on narrow phones.
- Live Departure Board has a dedicated mobile card layout and desktop table layout.
- Gate scanner layouts use dynamic viewport sizing and smaller camera QR targets for narrow screens.

The production dependency install timed out in the editing environment, so run this locally before deployment:

```powershell
npm install --prefix frontend
npm run build --prefix frontend
```
