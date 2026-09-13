import { createContext, useCallback, useEffect, useState } from "react";
import { apiClient, getToken, setToken, clearToken } from "../lib/apiClient";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiClient
      .get("/auth/me")
      .then((res) => setAdmin(res.data.admin))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post("/auth/login", { email, password });
    setToken(res.data.token);
    setAdmin(res.data.admin);
    return res.data.admin;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}
