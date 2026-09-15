import { type FocusEvent, type FormEvent, useState } from "react";
import type { Product, ProductInput } from "../../types/product";
import type { Proveedor } from "../../types/proveedor";
import type { Categoria } from "../../types/categoria";

interface ProductFormModalProps {
  product: Product | null;
  proveedores: Proveedor[];
  categorias: Categoria[];
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<void>;
}

const emptyForm: ProductInput = {
  name: "",
  categoriaId: "",
  quantity: 0,
  unit: "",
  price: 0,
  proveedorId: "",
  minStock: 0,
};

export function ProductFormModal({ product, proveedores, categorias, onClose, onSubmit }: ProductFormModalProps) {
  const [form, setForm] = useState<ProductInput>(
    product
      ? {
          name: product.name,
          categoriaId: product.categoriaId ?? "",
          quantity: product.quantity,
          unit: product.unit,
          price: product.price,
          proveedorId: product.proveedorId ?? "",
          minStock: product.minStock,
        }
      : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof ProductInput>(field: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateNumberField(field: "quantity" | "price" | "minStock", rawValue: string) {
    const withoutLeadingZeros = rawValue.replace(/^0+(?=\d)/, "");
    const parsed = withoutLeadingZeros === "" ? 0 : Number(withoutLeadingZeros);
    updateField(field, Number.isNaN(parsed) ? 0 : parsed);
  }

  function selectAllOnFocus(event: FocusEvent<HTMLInputElement>) {
    event.target.select();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ ...form, proveedorId: form.proveedorId || null, categoriaId: form.categoriaId || null });
      onClose();
    } catch {
      setError("No se pudo guardar el producto. Verifica los datos e intenta de nuevo.");
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
            {product ? "Editar producto" : "Nuevo producto"}
          </h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelClass}>Nombre</label>
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Categoria</label>
            <select
              required
              className={inputClass}
              value={form.categoriaId ?? ""}
              onChange={(event) => updateField("categoriaId", event.target.value)}
            >
              <option value="">Selecciona una categoria</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Proveedor</label>
            <select
              className={inputClass}
              value={form.proveedorId ?? ""}
              onChange={(event) => updateField("proveedorId", event.target.value)}
            >
              <option value="">Sin asignar</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Cantidad</label>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={form.quantity}
              onFocus={selectAllOnFocus}
              onChange={(event) => updateNumberField("quantity", event.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Unidad</label>
            <input
              required
              placeholder="unidades, m, sq ft..."
              className={inputClass}
              value={form.unit}
              onChange={(event) => updateField("unit", event.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Precio unitario (COP)</label>
            <input
              required
              type="number"
              min={0}
              step="1"
              className={inputClass}
              value={form.price}
              onFocus={selectAllOnFocus}
              onChange={(event) => updateNumberField("price", event.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Stock minimo</label>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={form.minStock}
              onFocus={selectAllOnFocus}
              onChange={(event) => updateNumberField("minStock", event.target.value)}
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
