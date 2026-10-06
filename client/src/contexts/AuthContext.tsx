import { useLocation } from "react-router-dom";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { User } from "../types";
import api from "../services/api";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  can: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperationsManager: boolean;
  isViewer: boolean;
  canManage: boolean;
  canFinance: boolean;
  canDispatch: boolean;
  canEditVehicles: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const accessSignature = useRef("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("tms_access_token")) {
      setLoading(false);
      return;
    }
    try {
      const data = (await api.get("/auth/me")).data.data;
      const signature = JSON.stringify([
        data.roleId,
        data.permissions,
        data.companyScopeEnabled,
      ]);
      if (accessSignature.current && accessSignature.current !== signature) {
        await queryClient.cancelQueries();
        queryClient.clear();
      }
      accessSignature.current = signature;
      setUser(data);
      localStorage.setItem("tms_user", JSON.stringify(data));
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem("tms_access_token");
        localStorage.removeItem("tms_user");
        setUser(null);
        queryClient.clear();
      }
    } finally {
      setLoading(false);
    }
  }, [queryClient]);
  useEffect(() => {
    refreshUser();
    const id = window.setInterval(refreshUser, 15000);
    window.addEventListener("focus", refreshUser);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refreshUser);
    };
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { accessToken, user: userData } = res.data.data;
    await queryClient.cancelQueries();
    queryClient.clear();
    localStorage.setItem("tms_access_token", accessToken);
    localStorage.setItem("tms_user", JSON.stringify(userData));
    accessSignature.current = JSON.stringify([
      userData.roleId,
      userData.permissions,
      userData.companyScopeEnabled,
    ]);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    } finally {
      await queryClient.cancelQueries();
      queryClient.clear();
      localStorage.removeItem("tms_access_token");
      localStorage.removeItem("tms_user");
      accessSignature.current = "";
      setUser(null);
    }
  };

  const can = (permission: string) => !!user?.permissions?.includes(permission);
  const pathResource =
    (
      {
        "/": "dashboard",
        "/settings": "configuration",
        "/schedules": "plans",
      } as Record<string, string>
    )[location.pathname] || location.pathname.split("/")[1];
  const canManage = ["create", "edit", "delete", "manage"].some((action) =>
    can(`${pathResource}.${action}`),
  );
  const isAdmin = can("users.view");
  const isOperationsManager = can("vehicles.editType") && !can("vehicles.edit");
  const isViewer = user?.role === "VIEWER";
  const canFinance = can("finance.view");
  const canDispatch = can("trips.create") || can("trips.edit");
  const canEditVehicles = can("vehicles.edit") || can("vehicles.editType");

  return (
    <AuthContext.Provider
      value={{
        user,
        can,
        refreshUser,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin,
        isOperationsManager,
        isViewer,
        canManage,
        canFinance,
        canDispatch,
        canEditVehicles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
