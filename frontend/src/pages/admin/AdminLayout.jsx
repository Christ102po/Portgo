import { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "../../components/admin/Sidebar";
import { Topbar } from "../../components/admin/Topbar";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/cn";

const PORTAL_HOME = {
  TICKETING_OFFICER: "/admin/ticketing",
  GATE_SCANNER: "/admin/gate-scanner",
};

const SIDEBAR_STORAGE_KEY = "portgo-admin-sidebar-collapsed";

function getInitialSidebarState() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
}

export default function AdminLayout() {
  const location = useLocation();
  const { admin } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarState);

  const restrictedHome = admin ? PORTAL_HOME[admin.role] : null;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  if (restrictedHome && location.pathname !== restrictedHome) {
    return <Navigate to={restrictedHome} replace />;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-surface">
      {/* Desktop sidebar stays fixed while the page content scrolls. */}
      <Sidebar
        className="fixed inset-y-0 left-0 z-40 hidden lg:flex"
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        allowCollapse
      />

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <Sidebar
                className="w-[min(19rem,88vw)] shadow-2xl"
                collapsed={false}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex min-h-[100dvh] min-w-0 flex-col transition-[padding] duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="min-h-[calc(100dvh-6.5rem)] min-w-0 w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
