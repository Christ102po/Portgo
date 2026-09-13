import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function RequireRole({ roles, children }) {
  const { admin } = useAuth();
  if (!admin || !roles.includes(admin.role)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}
