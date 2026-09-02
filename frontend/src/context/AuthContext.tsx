import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, AUTH_TOKEN_KEY, SESSION_EXPIRED_EVENT } from "../lib/api";
import type { AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSession() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ user: AuthUser }>("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSession();

    function handleSessionExpired() {
      setUser(null);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: AuthUser }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
