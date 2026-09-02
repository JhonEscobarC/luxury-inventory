import { type FormEvent, useState } from "react";
import type { Order, OrderInput, OrderItemInput } from "../../types/order";
import type { Product } from "../../types/product";

interface OrderFormModalProps {
  order: Order | null;
  products: Product[];
  onClose: () => void;
  onSubmit: (input: OrderInput) => Promise<void>;
  title?: string;
  defaultCustomerName?: string;
  defaultCustomerPhone?: string;
  lockCustomerPhone?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface DraftItem extends OrderItemInput {
  key: string;
}

function draftItemsFromOrder(order: Order | null): DraftItem[] {
  if (!order) {
    return [{ key: crypto.randomUUID(), productId: "", quantity: 1 }];
  }
  return order.items.map((item) => ({ key: item.id, productId: item.productId, quantity: item.quantity }));
}

export function OrderFormModal({
  order,
  products,
  onClose,
  onSubmit,
  title,
  defaultCustomerName,
  defaultCustomerPhone,
  lockCustomerPhone,
}: OrderFormModalProps) {
  const [customerName, setCustomerName] = useState(order?.customerName ?? defaultCustomerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(order?.customerPhone ?? defaultCustomerPhone ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [items, setItems] = useState<DraftItem[]>(draftItemsFromOrder(order));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productById = new Map(products.map((product) => [product.id, product]));

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { key: crypto.randomUUID(), productId: "", quantity: 1 }]);
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  const total = items.reduce((sum, item) => {
    const product = productById.get(item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const validItems = items.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      setError("Agrega al menos un producto con cantidad valida.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        notes: notes || null,
        items: validItems.map(({ productId, quantity }) => ({ productId, quantity })),
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
          <h3 className="text-headline-md-mobile text-primary uppercase">
            {title ?? (order ? "Editar pedido" : "Nuevo pedido")}
          </h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <label className={labelClass}>Cliente</label>
            <input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Telefono</label>
            <input
              className={`${inputClass} ${lockCustomerPhone ? "opacity-60 cursor-not-allowed" : ""}`}
              value={customerPhone}
              disabled={lockCustomerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
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

        <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-3">
          <h4 className="font-label-sm text-on-surface-variant uppercase tracking-widest">Productos</h4>
          <button
            type="button"
            onClick={addItem}
            className="font-label-sm uppercase text-primary hover:text-primary-fixed flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Agregar producto
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          {items.map((item) => {
            const product = productById.get(item.productId);
            return (
              <div key={item.key} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className={labelClass}>Producto</label>
                  <select
                    className={inputClass}
                    value={item.productId}
                    onChange={(e) => updateItem(item.key, { productId: e.target.value })}
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
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
                  <label className={labelClass}>Subtotal</label>
                  <p className="font-body-md text-on-surface py-3">
                    {product ? currencyFormatter.format(product.price * item.quantity) : "-"}
                  </p>
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
            );
          })}
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
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
