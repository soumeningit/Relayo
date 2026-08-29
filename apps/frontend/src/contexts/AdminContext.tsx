/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from "react";
import { encryptStorage } from "../lib/storage";
import type { AdminSessionUser } from "../types/admin";

interface AdminSession {
  token: string | null;
  user: AdminSessionUser | null;
}

interface AdminContextType extends AdminSession {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AdminSessionUser) => void;
  logout: () => void;
  updateUser: (userData: Partial<AdminSessionUser>) => void;
}

const EMPTY_SESSION: AdminSession = { token: null, user: null };
const AdminContext = createContext<AdminContextType | undefined>(undefined);

function clearStoredAdminSession() {
  encryptStorage.removeItem("admin-token");
  encryptStorage.removeItem("admin-user");
}

function readStoredAdminSession(): AdminSession {
  try {
    const storedToken = encryptStorage.getItem<string>("admin-token") || null;
    const storedUser =
      encryptStorage.getItem<AdminSessionUser>("admin-user") || null;

    if (!storedToken || !storedUser) return EMPTY_SESSION;
    return { token: storedToken, user: storedUser };
  } catch {
    clearStoredAdminSession();
    return EMPTY_SESSION;
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession>(readStoredAdminSession);

  const login = (newToken: string, newUser: AdminSessionUser) => {
    setSession({ token: newToken, user: newUser });
    encryptStorage.setItem("admin-token", newToken);
    encryptStorage.setItem("admin-user", newUser);
  };

  const logout = () => {
    setSession(EMPTY_SESSION);
    clearStoredAdminSession();
  };

  const updateUser = (userData: Partial<AdminSessionUser>) => {
    setSession((prev) => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...userData };
      encryptStorage.setItem("admin-user", updated);
      return { ...prev, user: updated };
    });
  };

  const value: AdminContextType = {
    ...session,
    isAuthenticated: !!session.token && !!session.user,
    isLoading: false,
    login,
    logout,
    updateUser,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within an AdminProvider");
  return context;
}