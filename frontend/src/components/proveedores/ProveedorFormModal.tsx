import { type FormEvent, useState } from "react";
import type { Proveedor, ProveedorInput } from "../../types/proveedor";

interface ProveedorFormModalProps {
  proveedor: Proveedor | null;
  onClose: () => void;
  onSubmit: (input: ProveedorInput) => Promise<void>;
}

export function ProveedorFormModal({ proveedor, onClose, onSubmit }: ProveedorFormModalProps) {
  const [name, setName] = useState(proveedor?.name ?? "");
  const [contactName, setContactName] = useState(proveedor?.contactName ?? "");
  const [phone, setPhone] = useState(proveedor?.phone ?? "");
  const [email, setEmail] = useState(proveedor?.email ?? "");
  const [address, setAddress] = useState(proveedor?.address ?? "");
  const [category, setCategory] = useState(proveedor?.category ?? "");
  const [notes, setNotes] = useState(proveedor?.notes ?? "");
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
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        category: category || null,
        notes: notes || null,
      });
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo guardar el proveedor.";
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
        className="relative w-full max-w-2xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-headline-md-mobile text-primary uppercase">
            {proveedor ? "Editar proveedor" : "Nuevo proveedor"}
          </h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre</label>
            <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Categoria</label>
            <input
              className={inputClass}
              placeholder="Estructural, Electrico..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Contacto</label>
            <input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Telefono</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Correo</label>
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Direccion</label>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notas</label>
            <textarea
              className={inputClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
