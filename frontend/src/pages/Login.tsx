import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Correo o contrasena incorrectos");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop overflow-hidden relative bg-background">
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(198, 161, 91, 0.1) 0%, transparent 50%)" }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-8 md:p-12 flex flex-col items-center">
          <div className="mb-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 border border-primary flex items-center justify-center">
              <span className="text-primary text-2xl font-bold tracking-widest">L</span>
            </div>
            <h1 className="text-headline-md-mobile text-primary uppercase tracking-widest font-bold">LUXURY</h1>
            <p className="font-label-sm text-on-surface-variant uppercase tracking-widest">
              Diseno y Construccion
            </p>
          </div>

          <form className="w-full space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="relative border-b border-[#262626] gold-border-focus transition-colors duration-300">
                <label className="sr-only" htmlFor="email">
                  Correo electronico
                </label>
                <div className="flex items-center text-on-surface-variant mb-2">
                  <span className="material-symbols-outlined mr-3 text-[20px]">person</span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    placeholder="Correo electronico"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-on-surface font-body-md placeholder-on-surface-variant/50 p-0"
                  />
                </div>
              </div>

              <div className="relative border-b border-[#262626] gold-border-focus transition-colors duration-300">
                <label className="sr-only" htmlFor="password">
                  Contrasena
                </label>
                <div className="flex items-center text-on-surface-variant mb-2">
                  <span className="material-symbols-outlined mr-3 text-[20px]">lock</span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Contrasena"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-on-surface font-body-md placeholder-on-surface-variant/50 p-0"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-error font-label-sm uppercase tracking-wider">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-container text-on-primary font-label-sm uppercase py-4 hover:bg-primary-fixed transition-colors duration-300 mt-4 tracking-widest disabled:opacity-60"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
