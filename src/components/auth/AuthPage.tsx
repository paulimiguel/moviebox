import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

const LOGIN_POSTERS = [
  { src: "/login-posters/jurassic-park.jpg", title: "Jurassic Park" },
  { src: "/login-posters/the-godfather.jpg", title: "The Godfather" },
  { src: "/login-posters/the-matrix.jpg", title: "The Matrix" },
  { src: "/login-posters/ghost.jpg", title: "Ghost" },
  { src: "/login-posters/forrest-gump.jpg", title: "Forrest Gump" },
  { src: "/login-posters/pulp-fiction.jpg", title: "Pulp Fiction" },
  { src: "/login-posters/friends.jpg", title: "Friends" },
  { src: "/login-posters/breaking-bad.jpg", title: "Breaking Bad" },
  { src: "/login-posters/lost.jpg", title: "Lost" },
  { src: "/login-posters/this-is-us.jpg", title: "This Is Us" },
  { src: "/login-posters/pretty-woman.jpg", title: "Pretty Woman" },
  {
    src: "/login-posters/back-to-the-future.jpg",
    title: "Back to the Future",
  },
  { src: "/login-posters/et.jpg", title: "E.T." },
  { src: "/login-posters/titanic.jpg", title: "Titanic" },
  { src: "/login-posters/dirty-dancing.jpg", title: "Dirty Dancing" },
  { src: "/login-posters/home-alone.jpg", title: "Home Alone" },
  {
    src: "/login-posters/the-shawshank-redemption.jpg",
    title: "The Shawshank Redemption",
  },
  { src: "/login-posters/notting-hill.jpg", title: "Notting Hill" },
  { src: "/login-posters/the-notebook.jpg", title: "The Notebook" },
  { src: "/login-posters/the-holiday.jpg", title: "The Holiday" },
] as const;

const LOGIN_EDGE_POSTERS = [
  { src: "/login-posters/the-sixth-sense.jpg", title: "The Sixth Sense" },
  { src: "/login-posters/the-truman-show.jpg", title: "The Truman Show" },
  {
    src: "/login-posters/the-devil-wears-prada.jpg",
    title: "The Devil Wears Prada",
  },
  { src: "/login-posters/the-green-mile.jpg", title: "The Green Mile" },
  { src: "/login-posters/youve-got-mail.jpg", title: "You've Got Mail" },
] as const;

export const AuthPage = () => {
  const { login, register } = useAuth();
  const posterPanelRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("google_error")) return;

    setError("No se pudo iniciar sesion con Google. Intenta nuevamente.");
    url.searchParams.delete("google_error");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    const panel = posterPanelRef.current;
    if (!panel) return;

    panel.scrollTop = (panel.scrollHeight - panel.clientHeight) / 2;
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo continuar",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(420px,0.8fr)_1.2fr]">
      <section className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <img
            src="/moviebox-logo-red.png"
            alt="MovieBox"
            className="mx-auto mb-10 h-auto w-full max-w-[290px]"
          />
          <div
            className="mb-7 flex border-b border-slate-200"
            aria-label="Acceso"
          >
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setError("");
                  if (item === "register") {
                    setEmail("");
                    setPassword("");
                    setShowPassword(false);
                  }
                }}
                className={`relative flex-1 px-3 py-3 text-sm font-semibold ${mode === item ? "text-ink" : "text-slate-400"}`}
              >
                {item === "login" ? "INICIAR SESION" : "CREAR CUENTA"}
                {mode === item && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 bg-coral" />
                )}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <label className="block text-sm font-medium text-slate-700">
                Nombre
                <input
                  className="control mt-1.5 w-full"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  required
                  autoComplete="name"
                />
              </label>
            )}
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                className="control mt-1.5 w-full"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Contrasena
              <span className="relative mt-1.5 block">
                <input
                  className="control w-full pr-11"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                  title={
                    showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                  }
                  aria-label={
                    showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            </label>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="primary-button w-full"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "INGRESAR" : "CREAR CUENTA"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">o</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={() => window.location.assign(api.auth.getGoogleLoginUrl(window.location.href))}
          >
            <img
              src="/google-logo.svg"
              alt=""
              className="h-5 w-5"
              aria-hidden="true"
            />
            ENTRAR CON GOOGLE
          </button>
        </div>
      </section>

      <section
        ref={posterPanelRef}
        className="relative hidden max-h-screen min-h-screen overflow-y-auto overscroll-contain bg-black lg:block"
        aria-hidden="true"
      >
        <div className="grid min-h-full grid-cols-5 gap-3 overflow-hidden px-3 py-6">
          {[0, 1, 2, 3, 4].map((column) => {
            const edgePoster = LOGIN_EDGE_POSTERS[column];

            return (
              <div
                key={column}
                className={`relative flex min-w-0 self-start flex-col gap-3 ${column % 2 === 0 ? "" : "mt-[75%]"}`}
              >
                {column % 2 !== 0 && (
                  <div className="absolute inset-x-0 bottom-[calc(100%+0.75rem)] aspect-[2/3] overflow-hidden bg-white shadow-card">
                    <img
                      src={edgePoster.src}
                      alt={edgePoster.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {LOGIN_POSTERS.filter(
                  (_, posterIndex) => posterIndex % 5 === column,
                ).map((poster) => (
                  <div
                    key={poster.src}
                    className="aspect-[2/3] flex-none overflow-hidden bg-white shadow-card"
                  >
                    <img
                      src={poster.src}
                      alt={poster.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {column % 2 === 0 && (
                  <div
                    className="absolute inset-x-0 top-[calc(100%+0.75rem)] aspect-[2/3] overflow-hidden bg-white shadow-card"
                  >
                    <img
                      src={edgePoster.src}
                      alt={edgePoster.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
