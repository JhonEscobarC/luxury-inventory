import { type FormEvent, useState } from "react";
import type { Obra, ObraInput } from "../../types/obra";
import type { Proyecto } from "../../types/proyecto";

interface ObraFormModalProps {
  obra: Obra | null;
  proyectos: Proyecto[];
  /** Proyecto preseleccionado al crear una obra desde la vista de un proyecto especifico. */
  defaultProyectoId?: string | null;
  onClose: () => void;
  onSubmit: (input: ObraInput) => Promise<void>;
}

export function ObraFormModal({ obra, proyectos, defaultProyectoId, onClose, onSubmit }: ObraFormModalProps) {
  const [name, setName] = useState(obra?.name ?? "");
  const [address, setAddress] = useState(obra?.address ?? "");
  const [client, setClient] = useState(obra?.client ?? "");
  const [notes, setNotes] = useState(obra?.notes ?? "");
  const [proyectoId, setProyectoId] = useState(obra?.proyectoId ?? defaultProyectoId ?? "");
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
      await onSubmit({
        name,
        address: address || null,
        client: client || null,
        notes: notes || null,
        proyectoId: proyectoId || null,
      });
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo guardar la obra.";
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
          <h3 className="text-headline-md-mobile text-primary uppercase">{obra ? "Editar obra" : "Nueva obra"}</h3>
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
            <label className={labelClass}>Cliente</label>
            <input className={inputClass} value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Proyecto</label>
            <select className={inputClass} value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
              <option value="">Sin proyecto</option>
              {proyectos.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>
                  {proyecto.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Direccion</label>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
