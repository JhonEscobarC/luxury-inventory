import { type FocusEvent, type FormEvent, useEffect, useState } from "react";
import type { Product } from "../../types/product";
import type { MaterialUsoInput } from "../../types/materialUso";
import type { ObraEtapa } from "../../types/obraEtapa";
import { listObraEtapas } from "../../lib/obraEtapas";

interface RegistrarUsoModalProps {
  product: Product;
  onClose: () => void;
  onSubmit: (input: MaterialUsoInput) => Promise<void>;
}

export function RegistrarUsoModal({ product, onClose, onSubmit }: RegistrarUsoModalProps) {
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [obraEtapaId, setObraEtapaId] = useState("");
  const [etapas, setEtapas] = useState<ObraEtapa[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!product.obraId) return;
    listObraEtapas(product.obraId).then(setEtapas).catch(() => setEtapas([]));
  }, [product.obraId]);

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
  const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

  function selectAllOnFocus(event: FocusEvent<HTMLInputElement>) {
    event.target.select();
  }

  function updateQuantity(rawValue: string) {
    const withoutLeadingZeros = rawValue.replace(/^0+(?=\d)/, "");
    const parsed = withoutLeadingZeros === "" ? 0 : Number(withoutLeadingZeros);
    setQuantity(Number.isNaN(parsed) ? 0 : parsed);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError("La cantidad debe ser mayor a cero.");
      return;
    }
    if (quantity > product.quantity) {
      setError("La cantidad supera el stock disponible.");
      return;
    }
    if (!reason.trim()) {
      setError("Indica la razon del uso.");
      return;
    }
    if (!obraEtapaId) {
      setError("Selecciona a que etapa de la obra va destinado este uso.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ productId: product.id, quantity, reason: reason.trim(), obraEtapaId });
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo registrar el uso del material.";
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
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">Registrar uso</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase mb-6">
          {product.name} - Disponible: {product.quantity} {product.unit}
        </p>

        <div className="flex flex-col gap-6">
          <div>
            <label className={labelClass}>Cantidad usada ({product.unit})</label>
            <input
              required
              type="number"
              min={0}
              max={product.quantity}
              step="0.01"
              className={inputClass}
              value={quantity}
              onFocus={selectAllOnFocus}
              onChange={(event) => updateQuantity(event.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Etapa de la obra</label>
            <select
              required
              className={inputClass}
              value={obraEtapaId}
              onChange={(event) => setObraEtapaId(event.target.value)}
            >
              <option value="">Selecciona una etapa</option>
              {etapas.map((etapa) => (
                <option key={etapa.id} value={etapa.id}>
                  {etapa.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Razon del uso</label>
            <textarea
              required
              rows={3}
              placeholder="Ej: Se uso en el muro del segundo piso"
              className={inputClass}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
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
            {isSubmitting ? "Guardando..." : "Registrar uso"}
          </button>
        </div>
      </form>
    </div>
  );
}
