import { type FormEvent, useState } from "react";
import type { AssignOrderInput, Order } from "../../types/order";
import type { Proveedor } from "../../types/proveedor";
import type { Product } from "../../types/product";

interface AssignOrderModalProps {
  order: Order;
  proveedores: Proveedor[];
  products: Product[];
  onClose: () => void;
  onSubmit: (input: AssignOrderInput) => Promise<void>;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function AssignOrderModal({ order, proveedores, products, onClose, onSubmit }: AssignOrderModalProps) {
  const [proveedorId, setProveedorId] = useState(order.proveedorId ?? proveedores[0]?.id ?? "");
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(order.items.map((item) => [item.id, item.unitPrice ?? 0])),
  );
  const [productLinks, setProductLinks] = useState<Record<string, string>>(
    Object.fromEntries(order.items.map((item) => [item.id, item.productId ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
  const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

  const total = order.items.reduce((sum, item) => sum + (prices[item.id] ?? 0) * item.quantity, 0);

  function handleProductLink(itemId: string, productId: string) {
    setProductLinks((prev) => ({ ...prev, [itemId]: productId }));
    const product = products.find((p) => p.id === productId);
    if (product && (prices[itemId] ?? 0) === 0) {
      setPrices((prev) => ({ ...prev, [itemId]: product.price }));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!proveedorId) {
      setError("Selecciona un proveedor.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        proveedorId,
        items: order.items.map((item) => ({
          itemId: item.id,
          unitPrice: prices[item.id] ?? 0,
          productId: productLinks[item.id] || null,
        })),
      });
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo asignar el proveedor.";
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
          <h3 className="text-headline-md-mobile text-primary uppercase">Asignar proveedor</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-6">
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

        <h4 className="font-label-sm text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-3 mb-4">
          Precio por material
        </h4>

        <div className="flex flex-col gap-4 mb-6">
          {order.items.map((item) => (
            <div key={item.id} className="border border-outline-variant p-4">
              <p className="font-body-md text-on-surface">{item.description}</p>
              <p className="font-label-sm text-on-surface-variant/70 uppercase mb-3">
                {item.quantity} {item.unit}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className={labelClass}>Vincular a inventario (opcional)</label>
                  <select
                    className={inputClass}
                    value={productLinks[item.id] ?? ""}
                    onChange={(e) => handleProductLink(item.id, e.target.value)}
                  >
                    <option value="">Sin vincular</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.quantity} {product.unit} disp.)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <label className={labelClass}>Precio unitario (COP)</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    className={inputClass}
                    value={prices[item.id] ?? 0}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, "");
                      const parsed = raw === "" ? 0 : Number(raw);
                      setPrices((prev) => ({ ...prev, [item.id]: Number.isNaN(parsed) ? 0 : parsed }));
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Subtotal</label>
                  <p className="font-body-md text-on-surface py-3">
                    {currencyFormatter.format((prices[item.id] ?? 0) * item.quantity)}
                  </p>
                </div>
              </div>

              {productLinks[item.id] &&
                (() => {
                  const linkedProduct = products.find((p) => p.id === productLinks[item.id]);
                  if (!linkedProduct) return null;
                  const insufficient = linkedProduct.quantity < item.quantity;
                  return (
                    <p
                      className={`font-label-sm uppercase mt-2 ${insufficient ? "text-error" : "text-on-surface-variant/70"}`}
                    >
                      {insufficient
                        ? `Stock insuficiente en inventario (disponible: ${linkedProduct.quantity} ${linkedProduct.unit})`
                        : "Al despachar, se descontara del inventario"}
                    </p>
                  );
                })()}
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
            {isSubmitting ? "Guardando..." : "Confirmar pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
