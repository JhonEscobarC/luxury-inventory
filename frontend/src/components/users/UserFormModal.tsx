import { type FormEvent, useState } from "react";
import type { Role } from "../../types/auth";
import type { CreateUserInput, ManagedUser, UpdateUserInput } from "../../types/user";

interface UserFormModalProps {
  user: ManagedUser | null;
  onClose: () => void;
  onSubmit: (input: CreateUserInput | UpdateUserInput) => Promise<void>;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "BODEGA", label: "Bodega" },
  { value: "VENTAS", label: "Ventas" },
];

export function UserFormModal({ user, onClose, onSubmit }: UserFormModalProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(user?.role ?? "VENTAS");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
  const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (user) {
        await onSubmit({ name, email, role });
      } else {
        await onSubmit({ name, email, password, role });
      }
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo guardar el usuario.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-headline-md-mobile text-primary uppercase">
            {user ? "Editar usuario" : "Nuevo usuario"}
          </h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <label className={labelClass}>Nombre</label>
            <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Correo electronico</label>
            <input
              required
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!user && (
            <div>
              <label className={labelClass}>Contrasena</label>
              <input
                required
                type="password"
                minLength={8}
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Rol</label>
            <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-error font-label-sm uppercase tracking-wider mt-6">{error}</p>}

        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-outline-variant text-on-surface-variant font-label-sm uppercase py-3 hover:border-primary hover:text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-primary-container text-on-primary font-label-sm uppercase py-3 hover:bg-primary-fixed transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
