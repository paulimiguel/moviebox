import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const AuthPage = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <img
            src="/moviebox-logo.png"
            alt="MovieBox"
            className="mb-10 h-auto w-full max-w-[290px]"
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
        </div>
      </section>

      <section
        className="relative hidden min-h-screen overflow-hidden bg-[#e5f2f1] lg:block"
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 bottom-0 top-[14%] grid grid-cols-4 gap-5 px-[9%]">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div
              key={item}
              className={`aspect-[2/3] self-end rounded-md border border-white/80 shadow-card ${
                [
                  "bg-coral",
                  "bg-[#f2cf66]",
                  "bg-aqua",
                  "bg-ink",
                  "bg-white",
                  "bg-[#8d9bb0]",
                  "bg-[#e8a7a0]",
                  "bg-[#a9c7a5]",
                ][item]
              } ${item % 2 === 0 ? "translate-y-16" : ""}`}
            />
          ))}
        </div>
      </section>
    </main>
  );
};
