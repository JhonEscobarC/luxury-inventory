import { type FormEvent, useState } from "react";
import type { Order, OrderInput, OrderItemInput } from "../../types/order";
import type { Obra } from "../../types/obra";

interface OrderFormModalProps {
  order: Order | null;
  obras: Obra[];
  onClose: () => void;
  onSubmit: (input: OrderInput) => Promise<void>;
}

interface DraftItem extends OrderItemInput {
  key: string;
}

function draftItemsFromOrder(order: Order | null): DraftItem[] {
  if (!order) {
    return [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "" }];
  }
  return order.items.map((item) => ({
    key: item.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
  }));
}

export function OrderFormModal({ order, obras, onClose, onSubmit }: OrderFormModalProps) {
  const [obraId, setObraId] = useState(order?.obraId ?? obras[0]?.id ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [items, setItems] = useState<DraftItem[]>(draftItemsFromOrder(order));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { key: crypto.randomUUID(), description: "", quantity: 1, unit: "" }]);
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const validItems = items.filter((item) => item.description.trim() && item.unit.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      setError("Agrega al menos un material con descripcion, unidad y cantidad validas.");
      return;
    }
    if (!order && !obraId) {
      setError("Selecciona una obra.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        obraId,
        notes: notes || null,
        items: validItems.map(({ description, quantity, unit }) => ({ description, quantity, unit })),
      });
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo guardar el pedido. Verifica los datos e intenta de nuevo.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
  const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-3xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-headline-md-mobile text-primary uppercase">{order ? "Editar pedido" : "Nuevo pedido"}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <label className={labelClass}>Obra</label>
            {order ? (
              <p className="font-body-md text-on-surface py-3">{order.obraName}</p>
            ) : (
              <select className={inputClass} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                {obras.length === 0 && <option value="">No tienes obras asignadas</option>}
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-3">
          <h4 className="font-label-sm text-on-surface-variant uppercase tracking-widest">Materiales</h4>
          <button
            type="button"
            onClick={addItem}
            className="font-label-sm uppercase text-primary hover:text-primary-fixed flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Agregar material
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          {items.map((item) => (
            <div key={item.key} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className={labelClass}>Descripcion</label>
                <input
                  className={inputClass}
                  placeholder="Ej. Cemento gris tipo I"
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-3">
                <label className={labelClass}>Cantidad</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  className={inputClass}
                  value={item.quantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, "");
                    const parsed = raw === "" ? 0 : Number(raw);
                    updateItem(item.key, { quantity: Number.isNaN(parsed) ? 0 : parsed });
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Unidad</label>
                <input
                  className={inputClass}
                  placeholder="sacos, m3..."
                  value={item.unit}
                  onChange={(e) => updateItem(item.key, { unit: e.target.value })}
                />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                  title="Quitar"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-error font-label-sm uppercase tracking-wider mb-6">{error}</p>}

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
