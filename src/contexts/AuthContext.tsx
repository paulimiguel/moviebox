import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, authToken, type MovieBoxUser } from "@/services/api";

interface AuthContextValue {
  user: MovieBoxUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<MovieBoxUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("google_login") === "success") {
      api.auth
        .completeGoogleLogin()
        .then(setUser)
        .catch(() => {
          authToken.clear();
          url.searchParams.set("google_error", "session");
        })
        .finally(() => {
          url.searchParams.delete("google_login");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          setIsLoading(false);
        });
      return;
    }

    if (!authToken.exists()) {
      setIsLoading(false);
      return;
    }

    api.auth
      .me()
      .then(setUser)
      .catch(() => authToken.clear())
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (email, password) =>
        setUser(await api.auth.login(email, password)),
      register: async (name, email, password) =>
        setUser(await api.auth.register(name, email, password)),
      logout: () => {
        authToken.clear();
        setUser(null);
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
