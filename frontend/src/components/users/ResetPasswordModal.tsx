import { type FormEvent, useState } from "react";

interface ResetPasswordModalProps {
  userName: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export function ResetPasswordModal({ userName, onClose, onSubmit }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(password);
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo actualizar la contrasena.";
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
        className="relative w-full max-w-sm bg-surface-container border border-outline-variant p-6"
      >
        <h3 className="text-headline-md-mobile text-on-surface uppercase mb-2">Restablecer contrasena</h3>
        <p className="font-body-md text-on-surface-variant mb-6">Nueva contrasena para {userName}.</p>

        <input
          required
          type="password"
          minLength={8}
          autoFocus
          placeholder="Nueva contrasena"
          className="w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-error font-label-sm uppercase tracking-wider mb-4">{error}</p>}

        <div className="flex gap-4">
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
