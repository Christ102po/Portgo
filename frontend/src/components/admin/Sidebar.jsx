import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Ship,
  CalendarClock,
  LogOut,
  Anchor,
  BarChart3,
  ScanLine,
  Ticket,
  ClipboardCheck,
  ShieldCheck,
  ShieldAlert,
  Users,
  Car,
  Monitor,
  BookUser,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/cn";

const ALL_STAFF = ["SUPER_ADMIN", "ADMIN"];

const NAV_GROUPS = [
  {
    label: "Main Menu",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, roles: ALL_STAFF },
      { to: "/admin/records", label: "Passenger Records", icon: ClipboardList, roles: ALL_STAFF },
      { to: "/admin/manifest", label: "Manifest Inspection", icon: ClipboardCheck, roles: ALL_STAFF },
      { to: "/admin/ticketing", label: "Ticketing Desk", icon: Ticket, roles: [...ALL_STAFF, "TICKETING_OFFICER"] },
      { to: "/admin/gate-scanner", label: "Gate Scanner", icon: ScanLine, roles: [...ALL_STAFF, "GATE_SCANNER"] },
      { to: "/scanner", label: "Gate Pass Scanner", icon: ScanLine, roles: [...ALL_STAFF, "GATE_SCANNER"], external: true },
    ],
  },
  {
    label: "Port Operations",
    items: [
      { to: "/admin/ships", label: "Ships", icon: Ship, roles: ALL_STAFF },
      { to: "/admin/schedules", label: "Schedules", icon: CalendarClock, roles: ALL_STAFF },
      { to: "/admin/vehicles", label: "Vehicles & Cargo", icon: Car, roles: ALL_STAFF },
      { to: "/admin/barangay-masterlist", label: "Barangay Masterlist", icon: BookUser, roles: ALL_STAFF },
      { to: "/display", label: "Live Terminal Board", icon: Monitor, roles: [...ALL_STAFF, "TICKETING_OFFICER", "GATE_SCANNER"], external: true },
    ],
  },
  {
    label: "System & Reports",
    items: [
      { to: "/admin/reports", label: "Reports & Analytics", icon: BarChart3, roles: ALL_STAFF },
      { to: "/admin/watchlist", label: "Security Watchlist", icon: ShieldAlert, roles: ["SUPER_ADMIN", "ADMIN"] },
      { to: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
      { to: "/admin/staff", label: "Manage Staff", icon: Users, roles: ["SUPER_ADMIN"] },
    ],
  },
];

export function Sidebar({ className, onNavigate }) {
  const { admin, logout } = useAuth();

  return (
    <aside
      className={cn(
        "flex h-[100dvh] w-64 shrink-0 flex-col justify-between overflow-hidden border-r border-emerald-950/40 bg-emerald-900 text-white",
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-2 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-200 text-emerald-900 shadow-[0_0_20px_-2px_rgba(254,240,138,0.5)]">
          <Anchor className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-none">PORTGO</p>
          <p className="truncate text-[11px] text-white/50">Admin Dashboard</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || item.roles.includes(admin?.role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-white/35">
                {group.label}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  if (item.external) {
                    return (
                      <a
                        key={item.to}
                        href={item.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onNavigate}
                        className="group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-white/70 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </a>
                    );
                  }
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-yellow-200 text-emerald-900 shadow-[0_4px_14px_-2px_rgba(254,240,138,0.5)]"
                            : "text-white/70 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 px-4">
          <p className="truncate text-sm font-medium">{admin?.fullName}</p>
          <p className="truncate text-xs text-white/50">{admin?.role?.replaceAll("_", " ")}</p>
        </div>
        <button
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
