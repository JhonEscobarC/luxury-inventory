import { type FormEvent, useState } from "react";
import type { Contratista, ContratistaInput } from "../../types/contratista";

interface ContratistaFormModalProps {
  contratista: Contratista | null;
  onClose: () => void;
  onSubmit: (input: ContratistaInput) => Promise<void>;
}

export function ContratistaFormModal({ contratista, onClose, onSubmit }: ContratistaFormModalProps) {
  const [name, setName] = useState(contratista?.name ?? "");
  const [oficio, setOficio] = useState(contratista?.oficio ?? "");
  const [phone, setPhone] = useState(contratista?.phone ?? "");
  const [email, setEmail] = useState(contratista?.email ?? "");
  const [notes, setNotes] = useState(contratista?.notes ?? "");
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
        oficio: oficio || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      });
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo guardar el contratista.";
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
            {contratista ? "Editar contratista" : "Nuevo contratista"}
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
            <label className={labelClass}>Oficio</label>
            <input
              placeholder="Plomero, Electricista, Maestro de obra..."
              className={inputClass}
              value={oficio}
              onChange={(e) => setOficio(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Telefono</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Correo</label>
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
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
