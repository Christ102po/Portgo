import { Routes, Route } from "react-router-dom";
import KioskLandingPage from "./pages/KioskLandingPage";
import KioskPage from "./pages/KioskPage";
import KioskQrScannerPage from "./pages/KioskQrScannerPage";
import LoginPage from "./pages/admin/LoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import RecordsPage from "./pages/admin/RecordsPage";
import ManifestDashboardPage from "./pages/admin/ManifestDashboardPage";
import TicketingDeskPage from "./pages/admin/TicketingDeskPage";
import GateScannerPage from "./pages/admin/GateScannerPage";
import GatePassScannerPage from "./pages/GatePassScannerPage";
import ReportsPage from "./pages/admin/ReportsPage";
import ShipsPage from "./pages/admin/ShipsPage";
import SchedulesPage from "./pages/admin/SchedulesPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import WatchlistPage from "./pages/admin/WatchlistPage";
import StaffPage from "./pages/admin/StaffPage";
import PortInformationPage from "./pages/admin/PortInformationPage";
import DisplayBoardPage from "./pages/DisplayBoardPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminLayout from "./pages/admin/AdminLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RequireRole } from "./routes/RequireRole";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<KioskLandingPage />} />
      <Route path="/register" element={<KioskPage />} />
      <Route path="/scan-pass" element={<KioskQrScannerPage />} />
      <Route path="/display" element={<DisplayBoardPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/scanner"
        element={
          <ProtectedRoute>
            <RequireRole roles={["SUPER_ADMIN", "ADMIN", "GATE_SCANNER"]}>
              <GatePassScannerPage />
            </RequireRole>
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="manifest" element={<ManifestDashboardPage />} />
        <Route path="ticketing" element={<RequireRole roles={["SUPER_ADMIN", "ADMIN", "TICKETING_OFFICER"]}><TicketingDeskPage /></RequireRole>} />
        <Route path="gate-scanner" element={<RequireRole roles={["SUPER_ADMIN", "ADMIN", "GATE_SCANNER"]}><GateScannerPage /></RequireRole>} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="port-information" element={<RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><PortInformationPage /></RequireRole>} />
        <Route path="ships" element={<ShipsPage />} />
        <Route path="schedules" element={<SchedulesPage />} />
        <Route path="audit-logs" element={<RequireRole roles={["SUPER_ADMIN"]}><AuditLogsPage /></RequireRole>} />
        <Route path="watchlist" element={<RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><WatchlistPage /></RequireRole>} />
        <Route path="staff" element={<RequireRole roles={["SUPER_ADMIN"]}><StaffPage /></RequireRole>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
