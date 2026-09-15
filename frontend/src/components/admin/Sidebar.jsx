import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  ShieldQuestion,
  Users,
  Monitor,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/cn";

const ALL_STAFF = ["SUPER_ADMIN", "ADMIN"];

const NAV_GROUPS = [
  {
    label: "Main Menu",
    icon: LayoutDashboard,
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
    icon: Ship,
    items: [
      { to: "/admin/ships", label: "Ships", icon: Ship, roles: ALL_STAFF },
      { to: "/admin/schedules", label: "Schedules", icon: CalendarClock, roles: ALL_STAFF },
      { to: "/display", label: "Live Terminal Board", icon: Monitor, roles: [...ALL_STAFF, "TICKETING_OFFICER", "GATE_SCANNER"], external: true },
    ],
  },
  {
    label: "System & Reports",
    icon: BarChart3,
    items: [
      { to: "/admin/reports", label: "Reports & Analytics", icon: BarChart3, roles: ALL_STAFF },
      { to: "/admin/port-information", label: "Guidelines & Hotlines", icon: ShieldQuestion, roles: ALL_STAFF },
      { to: "/admin/watchlist", label: "Security Watchlist", icon: ShieldAlert, roles: ["SUPER_ADMIN", "ADMIN"] },
      { to: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
      { to: "/admin/staff", label: "Manage Staff", icon: Users, roles: ["SUPER_ADMIN"] },
    ],
  },
];

function isItemActive(item, pathname) {
  if (item.external) return false;
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function Sidebar({
  className,
  onNavigate,
  collapsed = false,
  onCollapsedChange,
  allowCollapse = false,
}) {
  const { admin, logout } = useAuth();
  const location = useLocation();

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.roles || item.roles.includes(admin?.role)),
      })).filter((group) => group.items.length > 0),
    [admin?.role]
  );

  const activeGroupLabel = useMemo(() => {
    const active = visibleGroups.find((group) => group.items.some((item) => isItemActive(item, location.pathname)));
    return active?.label || visibleGroups[0]?.label || "";
  }, [location.pathname, visibleGroups]);

  const [openGroup, setOpenGroup] = useState(activeGroupLabel);

  useEffect(() => {
    if (activeGroupLabel) setOpenGroup(activeGroupLabel);
  }, [activeGroupLabel]);

  const toggleGroup = (label) => {
    if (collapsed && allowCollapse) {
      onCollapsedChange?.(false);
      setOpenGroup(label);
      return;
    }
    setOpenGroup((current) => (current === label ? "" : label));
  };

  return (
    <aside
      className={cn(
        "flex h-[100dvh] shrink-0 flex-col overflow-visible border-r border-emerald-950/40 bg-emerald-900 text-white shadow-xl shadow-emerald-950/5 transition-[width] duration-300",
        collapsed ? "w-20" : "w-64",
        className
      )}
    >
      <div
        className={cn(
          "flex h-[72px] shrink-0 items-center border-b border-white/10",
          collapsed ? "justify-center px-2" : "gap-2 px-4"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-200 text-emerald-900 shadow-[0_0_20px_-2px_rgba(254,240,138,0.5)]">
          <Anchor className="h-5 w-5" />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-none">PORTGO</p>
            <p className="mt-1 truncate text-[11px] text-white/50">Admin Dashboard</p>
          </div>
        )}

        {allowCollapse && (
          <button
            type="button"
            onClick={() => onCollapsedChange?.(!collapsed)}
            className={cn(
              "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/65 transition hover:bg-white/10 hover:text-white lg:inline-flex",
              collapsed && "absolute left-[62px] top-4 z-10 translate-x-1/2 border border-emerald-800 bg-emerald-900 shadow-lg"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
            title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4", collapsed ? "px-2 pt-3" : "px-3 pt-3")}>
        <div className="space-y-2">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = openGroup === group.label;
            const hasActiveItem = group.items.some((item) => isItemActive(item, location.pathname));

            return (
              <section key={group.label} className="overflow-hidden rounded-2xl">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "flex w-full items-center text-left font-semibold transition-all",
                    collapsed
                      ? "h-12 justify-center rounded-xl px-0"
                      : "gap-3 rounded-xl px-3 py-2.5 text-xs",
                    hasActiveItem
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                  aria-expanded={!collapsed && isOpen}
                  title={collapsed ? group.label : undefined}
                >
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate uppercase tracking-[0.12em]">{group.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="mt-1 space-y-1 px-1 pb-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const itemClasses =
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200";

                      if (item.external) {
                        return (
                          <a
                            key={item.to}
                            href={item.to}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onNavigate}
                            className={cn(
                              itemClasses,
                              "text-white/65 hover:bg-white/10 hover:text-white"
                            )}
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
                              itemClasses,
                              isActive
                                ? "bg-yellow-200 text-emerald-950 shadow-[0_4px_14px_-3px_rgba(254,240,138,0.45)]"
                                : "text-white/65 hover:bg-white/10 hover:text-white"
                            )
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </nav>

      <div className={cn("shrink-0 border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))]", collapsed ? "px-2 pt-3" : "px-3 pt-4")}>
        {!collapsed && (
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium">{admin?.fullName}</p>
            <p className="truncate text-xs text-white/50">{admin?.role?.replaceAll("_", " ")}</p>
          </div>
        )}

        <button
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className={cn(
            "flex items-center rounded-xl text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200",
            collapsed ? "h-11 w-full justify-center px-0" : "w-full gap-3 px-3 py-2.5"
          )}
          title={collapsed ? "Log Out" : undefined}
          aria-label="Log Out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
