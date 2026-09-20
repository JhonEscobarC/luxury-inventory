import { type FormEvent, useState } from "react";
import { createGastoAdicional } from "../../lib/gastosAdicionales";
import type { GastoAdicional, MetodoPago } from "../../types/gastoAdicional";
import type { Obra } from "../../types/obra";

const METODO_PAGO_OPTIONS: { value: MetodoPago; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
];

interface GastoAdicionalModalProps {
  obras: Obra[];
  onClose: () => void;
  onCreated: (gasto: GastoAdicional) => void;
}

export function GastoAdicionalModal({ obras, onClose, onCreated }: GastoAdicionalModalProps) {
  const [concepto, setConcepto] = useState("");
  const [amount, setAmount] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [obraId, setObraId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
  const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!concepto.trim()) {
      setError("Describe el gasto");
      return;
    }
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createGastoAdicional({
        concepto: concepto.trim(),
        amount: value,
        metodoPago,
        obraId: obraId || null,
        notes: notes || null,
      });
      onCreated(created);
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo registrar el gasto.";
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
          <h3 className="text-headline-md-mobile text-primary uppercase">Registrar gasto adicional</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <label className={labelClass}>Concepto</label>
            <input
              required
              className={inputClass}
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Transporte de materiales"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Monto</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={amount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setAmount(e.target.value.replace(/^0+(?=\d)/, ""))}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Metodo de pago</label>
              <select className={inputClass} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}>
                {METODO_PAGO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Obra (opcional)</label>
            <select className={inputClass} value={obraId} onChange={(e) => setObraId(e.target.value)}>
              <option value="">General (sin obra)</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Notas (opcional)</label>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
            {isSubmitting ? "Guardando..." : "Registrar gasto"}
          </button>
        </div>
      </form>
    </div>
  );
}
