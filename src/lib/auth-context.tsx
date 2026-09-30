import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentUser, loginUser, logoutUser, registerUser, type AuthUser } from "./auth";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: { name: string; email: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const nextUser = loginUser(email, password);
    setUser(nextUser);
    return nextUser;
  };

  const register = async (input: { name: string; email: string; password: string }) => {
    const nextUser = registerUser(input);
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
