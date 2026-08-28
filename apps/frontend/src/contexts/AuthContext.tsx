/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import { encryptStorage } from "../lib/storage";

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface Session {
  token: string | null;
  user: User | null;
}

interface AuthContextType extends Session {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<Omit<User, "id">>) => void;
}

const EMPTY_SESSION: Session = { token: null, user: null };
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearStoredCredentials() {
  encryptStorage.removeItem("token");
  encryptStorage.removeItem("user");
}

function readStoredSession(): Session {
  try {
    const storedToken = encryptStorage.getItem<string>("token") || null;
    const storedUser = encryptStorage.getItem<User>("user") || null;

    if (!storedToken || !storedUser) return EMPTY_SESSION;

    try {
      const decoded = jwtDecode<{ exp?: number }>(storedToken);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        clearStoredCredentials();
        return EMPTY_SESSION;
      }
    } catch {
      clearStoredCredentials();
      return EMPTY_SESSION;
    }

    return { token: storedToken, user: storedUser };
  } catch {
    clearStoredCredentials();
    return EMPTY_SESSION;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(readStoredSession);

  const login = (newToken: string, newUser: User) => {
    setSession({ token: newToken, user: newUser });
    encryptStorage.setItem("token", newToken);
    encryptStorage.setItem("user", newUser);
  };

  const logout = () => {
    setSession(EMPTY_SESSION);
    clearStoredCredentials();
  };

  const updateUser = (userData: Partial<Omit<User, "id">>) => {
    setSession((prev) => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...userData };
      encryptStorage.setItem("user", updated);
      return { ...prev, user: updated };
    });
  };

  const value: AuthContextType = {
    ...session,
    isAuthenticated: !!session.token && !!session.user,
    isLoading: false,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
