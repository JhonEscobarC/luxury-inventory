import { type FormEvent, useState } from "react";
import type { AssignOrderInput, FormaPago, Order } from "../../types/order";
import type { Proveedor } from "../../types/proveedor";
import type { Categoria } from "../../types/categoria";

interface AssignOrderModalProps {
  order: Order;
  proveedores: Proveedor[];
  categorias: Categoria[];
  onClose: () => void;
  onSubmit: (input: AssignOrderInput) => Promise<void>;
}

interface DraftItem {
  key: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  categoriaId: string;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function draftItemsFromOrder(order: Order): DraftItem[] {
  return order.items.map((item) => ({
    key: item.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice ?? 0,
    categoriaId: item.categoriaId ?? "",
  }));
}

export function AssignOrderModal({ order, proveedores, categorias, onClose, onSubmit }: AssignOrderModalProps) {
  const [proveedorId, setProveedorId] = useState(order.proveedorId ?? proveedores[0]?.id ?? "");
  const [formaPago, setFormaPago] = useState<FormaPago>(order.formaPago ?? "CONTADO");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [items, setItems] = useState<DraftItem[]>(draftItemsFromOrder(order));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
  const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), description: "", quantity: 1, unit: "", unitPrice: 0, categoriaId: "" },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!proveedorId) {
      setError("Selecciona un proveedor.");
      return;
    }
    const validItems = items.filter((item) => item.description.trim() && item.unit.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      setError("Agrega al menos un material con descripcion, unidad y cantidad validas.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        proveedorId,
        notes: notes || null,
        formaPago,
        items: validItems.map(({ description, quantity, unit, unitPrice, categoriaId }) => ({
          description,
          quantity,
          unit,
          unitPrice,
          categoriaId: categoriaId || null,
        })),
      });
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo guardar el pedido.";
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
        className="relative w-full max-w-3xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-headline-md-mobile text-primary uppercase">Editar y pasar a compra</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className={labelClass}>Obra</label>
            <p className="font-body-md text-on-surface py-3">{order.obraName}</p>
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className={labelClass}>Proveedor</label>
            <select className={inputClass} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              {proveedores.length === 0 && <option value="">No hay proveedores activos</option>}
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Forma de pago</label>
            <select
              className={inputClass}
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value as FormaPago)}
            >
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Credito</option>
            </select>
            <p className="font-label-sm text-on-surface-variant/70 uppercase mt-2">
              {formaPago === "CONTADO"
                ? "Se paga de una vez: no queda registrado como deuda al proveedor."
                : "Queda registrado como deuda al proveedor hasta su posterior pago (abono)."}
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-3">
          <h4 className="font-label-sm text-on-surface-variant uppercase tracking-widest">Materiales y precios</h4>
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
            <div key={item.key} className="border border-outline-variant p-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end mb-3">
                <div className="sm:col-span-4">
                  <label className={labelClass}>Descripcion</label>
                  <input
                    className={inputClass}
                    placeholder="Ej. Cemento gris tipo I"
                    value={item.description}
                    onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
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
                <div className="sm:col-span-2">
                  <label className={labelClass}>Precio unitario</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    className={inputClass}
                    value={item.unitPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, "");
                      const parsed = raw === "" ? 0 : Number(raw);
                      updateItem(item.key, { unitPrice: Number.isNaN(parsed) ? 0 : parsed });
                    }}
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

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-9">
                  <label className={labelClass}>Categoria (para almacenar en inventario al recibir)</label>
                  <select
                    className={inputClass}
                    value={item.categoriaId}
                    onChange={(e) => updateItem(item.key, { categoriaId: e.target.value })}
                  >
                    <option value="">Sin categoria (no se inventaria)</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Subtotal</label>
                  <p className="font-body-md text-on-surface py-3">
                    {currencyFormatter.format(item.unitPrice * item.quantity)}
                  </p>
                </div>
              </div>

              {item.categoriaId && (
                <p className="font-label-sm text-on-surface-variant/70 uppercase mt-2">
                  Al marcar el pedido como recibido, este material se sumara automaticamente al inventario.
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end items-center gap-4 mb-8 border-t border-outline-variant pt-4">
          <span className="font-label-sm text-on-surface-variant uppercase tracking-widest">Total</span>
          <span className="text-headline-md-mobile text-primary">{currencyFormatter.format(total)}</span>
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
            {isSubmitting ? "Guardando..." : "Confirmar compra"}
          </button>
        </div>
      </form>
    </div>
  );
}
