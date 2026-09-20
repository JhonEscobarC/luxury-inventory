import { useEffect, useState } from "react";
import { listProductoHistorial } from "../../lib/products";
import type { Product, ProductoHistorialItem, ProductoHistorialTipo } from "../../types/product";

const TIPO_META: Record<ProductoHistorialTipo, { label: string; icon: string; color: string }> = {
  CREADO: { label: "Agregado", icon: "add_circle", color: "text-primary" },
  INGRESO: { label: "Ingreso", icon: "move_to_inbox", color: "text-secondary" },
  USO: { label: "Uso", icon: "construction", color: "text-tertiary" },
  EDITADO: { label: "Cambio", icon: "edit", color: "text-on-surface-variant" },
};

interface ProductoHistorialModalProps {
  product: Product;
  onClose: () => void;
}

export function ProductoHistorialModal({ product, onClose }: ProductoHistorialModalProps) {
  const [items, setItems] = useState<ProductoHistorialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProductoHistorial(product.id)
      .then(setItems)
      .catch(() => setError("No se pudo cargar el historial del producto."))
      .finally(() => setIsLoading(false));
  }, [product.id]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">Historial - {product.name}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary shrink-0">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase mb-6">
          {product.obraName ?? "General"} &middot; Disponible: {product.quantity} {product.unit}
        </p>

        {error && <p className="text-error font-label-sm uppercase mb-4">{error}</p>}
        {isLoading && <p className="text-on-surface-variant font-label-sm uppercase py-4">Cargando...</p>}
        {!isLoading && !error && items.length === 0 && (
          <p className="text-on-surface-variant/60 font-label-sm uppercase py-4">Sin movimientos registrados.</p>
        )}

        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const meta = TIPO_META[item.tipo];
            const fecha = new Date(item.createdAt);
            return (
              <div key={item.id} className="border border-outline-variant bg-surface p-4 flex gap-3">
                <span className={`material-symbols-outlined ${meta.color}`}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <p className={`font-label-sm uppercase ${meta.color}`}>{meta.label}</p>
                    <p className="font-label-sm text-on-surface-variant/70">
                      {fecha.toLocaleDateString("es-CO")}{" "}
                      {fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <p className="font-body-md text-on-surface mt-1">{item.descripcion}</p>
                  <p className="font-label-sm text-on-surface-variant/70 uppercase mt-1">
                    {item.cantidad !== null && (
                      <span className={item.cantidad < 0 ? "text-error" : "text-secondary"}>
                        {item.cantidad > 0 ? "+" : ""}
                        {item.cantidad} {product.unit}
                      </span>
                    )}
                    {item.cantidadResultante !== null && (
                      <span>
                        {item.cantidad !== null ? " · " : ""}Quedaron {item.cantidadResultante} {product.unit}
                      </span>
                    )}
                    {item.userName && <span>{item.cantidad !== null || item.cantidadResultante !== null ? " · " : ""}Por {item.userName}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
