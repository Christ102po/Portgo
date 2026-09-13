import { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "../../components/admin/Sidebar";
import { Topbar } from "../../components/admin/Topbar";
import { useAuth } from "../../hooks/useAuth";

const PORTAL_HOME = {
  TICKETING_OFFICER: "/admin/ticketing",
  GATE_SCANNER: "/admin/gate-scanner",
};

export default function AdminLayout() {
  const location = useLocation();
  const { admin } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const restrictedHome = admin ? PORTAL_HOME[admin.role] : null;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  if (restrictedHome && location.pathname !== restrictedHome) {
    return <Navigate to={restrictedHome} replace />;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-surface lg:flex">
      <Sidebar className="sticky top-0 hidden lg:flex" />

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
                onNavigate={() => setMobileNavOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-5 lg:p-8">
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
