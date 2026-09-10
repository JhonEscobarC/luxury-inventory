import { useState } from "react";
import type { Obra } from "../../types/obra";
import type { ManagedUser } from "../../types/user";

interface AssignUsersModalProps {
  obra: Obra;
  obraUsers: ManagedUser[];
  onClose: () => void;
  onSubmit: (userIds: string[]) => Promise<void>;
}

export function AssignUsersModal({ obra, obraUsers, onClose, onSubmit }: AssignUsersModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(obra.users?.map((u) => u.id) ?? []));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(Array.from(selected));
      onClose();
    } catch {
      setError("No se pudo actualizar la asignacion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container border border-outline-variant p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-headline-md-mobile text-primary uppercase">Usuarios de {obra.name}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
          Usuarios con rol Obra
        </p>

        {obraUsers.length === 0 && (
          <p className="font-body-md text-on-surface-variant mb-6">No hay usuarios con rol Obra todavia.</p>
        )}

        <div className="flex flex-col gap-2 mb-6 max-h-64 overflow-y-auto">
          {obraUsers.map((user) => (
            <label
              key={user.id}
              className="flex items-center gap-3 border border-outline-variant px-4 py-3 cursor-pointer hover:border-primary transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(user.id)}
                onChange={() => toggle(user.id)}
                className="w-4 h-4 accent-primary"
              />
              <div>
                <p className="font-body-md text-on-surface">{user.name}</p>
                <p className="font-label-sm text-on-surface-variant/70 uppercase">{user.email}</p>
              </div>
            </label>
          ))}
        </div>

        {error && <p className="text-error font-label-sm uppercase tracking-wider mb-4">{error}</p>}

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 border border-outline-variant text-on-surface-variant font-label-sm uppercase py-3 hover:border-primary hover:text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 bg-primary-container text-on-primary font-label-sm uppercase py-3 hover:bg-primary-fixed transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
