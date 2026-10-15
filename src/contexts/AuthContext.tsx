import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, authToken, type MovieBoxUser } from "@/services/api";

interface AuthContextValue {
  user: MovieBoxUser | null;
  isLoading: boolean;
  connectionError: boolean;
  retryConnection: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updatePreferredPlatforms: (preferredPlatforms: string[]) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<MovieBoxUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  // La sesión solo se descarta cuando el servidor dice que no es válida (401). Un corte de conexión
  // o un reinicio del servidor no cierran la sesión: se reintenta y, si sigue fallando, se ofrece reintentar.
  const restoreSession = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        setUser(await api.auth.restore());
        setConnectionError(false);
        setIsLoading(false);
        return;
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403 || status === 404) {
          authToken.clear();
          setConnectionError(false);
          setIsLoading(false);
          return;
        }
        if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    setConnectionError(true);
    setIsLoading(false);
  }, []);

  const retryConnection = useCallback(() => {
    setConnectionError(false);
    setIsLoading(true);
    void restoreSession();
  }, [restoreSession]);

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

    void restoreSession();
  }, [restoreSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      connectionError,
      retryConnection,
      login: async (email, password) =>
        setUser(await api.auth.login(email, password)),
      register: async (name, email, password) =>
        setUser(await api.auth.register(name, email, password)),
      updatePreferredPlatforms: async (preferredPlatforms) =>
        setUser(await api.auth.updatePreferredPlatforms(preferredPlatforms)),
      logout: () => {
        authToken.clear();
        void api.auth.logout();
        setUser(null);
      },
    }),
    [connectionError, isLoading, retryConnection, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
