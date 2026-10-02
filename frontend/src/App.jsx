import { Routes, Route } from "react-router-dom";
import TouristFillUpForm from "./pages/TouristFillUpForm";
import LocalFillUpForm from "./pages/LocalFillUpForm";
import KioskQrScannerPage from "./pages/KioskQrScannerPage";
import LoginPage from "./pages/admin/LoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import RecordsPage from "./pages/admin/RecordsPage";
import ShipsPage from "./pages/admin/ShipsPage";
import SchedulesPage from "./pages/admin/SchedulesPage";
import StaffPage from "./pages/admin/StaffPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminLayout from "./pages/admin/AdminLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RequireRole } from "./routes/RequireRole";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<KioskQrScannerPage />} />
      <Route path="/touristfillupform" element={<TouristFillUpForm />} />
      <Route path="/localfillupform" element={<LocalFillUpForm />} />
      <Route path="/scan-pass" element={<KioskQrScannerPage />} />
      <Route path="/admin/login" element={<LoginPage />} />

      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="tourist-records" element={<RecordsPage recordCategory="TOURIST" />} />
        <Route path="local-passenger-records" element={<RecordsPage recordCategory="LOCAL" />} />
        <Route path="ships" element={<ShipsPage />} />
        <Route path="schedules" element={<SchedulesPage />} />
        <Route path="staff" element={<RequireRole roles={["SUPER_ADMIN"]}><StaffPage /></RequireRole>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
