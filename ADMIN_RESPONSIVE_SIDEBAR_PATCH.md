# PORTGO Admin Responsive Sidebar Update

This update changes the admin navigation only. Backend/API/database logic is unchanged.

## What changed

- Desktop sidebar is now fixed to the left side and does not move when admin pages scroll.
- Added a minimize/expand control for desktop sidebar.
- Minimized state uses a narrow icon rail so admin pages have more working space.
- Sidebar minimized state is remembered in the browser.
- Main Menu, Port Operations, and System & Reports are now accordion buttons.
- Clicking a section button opens its menu choices; only the relevant section stays open by default.
- Clicking a section while the sidebar is minimized automatically expands it and opens that section.
- Mobile/tablet navigation remains an off-canvas drawer with the same accordion groups.
- Main admin content spacing is slightly more compact and scales across phone, tablet, laptop, desktop, and wide screens.

## Changed source files

- `frontend/src/components/admin/Sidebar.jsx`
- `frontend/src/pages/admin/AdminLayout.jsx`

No database migration is required.
