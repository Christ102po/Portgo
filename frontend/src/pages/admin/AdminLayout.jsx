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

  const restrictedHome = admin ? PORTAL_HOME[admin.role] : null;
  if (restrictedHome && location.pathname !== restrictedHome) {
    return <Navigate to={restrictedHome} replace />;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
