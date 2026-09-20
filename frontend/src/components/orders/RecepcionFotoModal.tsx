import { useEffect, useState } from "react";
import { getRecepcionFotoUrl } from "../../lib/orders";
import type { Order } from "../../types/order";

interface RecepcionFotoModalProps {
  order: Order;
  onClose: () => void;
}

export function RecepcionFotoModal({ order, onClose }: RecepcionFotoModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    getRecepcionFotoUrl(order.id)
      .then((u) => {
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => setError("No se pudo cargar la foto."));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [order.id]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">Foto de recepcion</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary shrink-0">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase mb-6">
          {order.obraName}
          {order.recepcionByName ? ` · Subida por ${order.recepcionByName}` : ""}
          {order.recepcionAt ? ` · ${new Date(order.recepcionAt).toLocaleString("es-CO")}` : ""}
        </p>
        {error && <p className="text-error font-label-sm uppercase">{error}</p>}
        {!url && !error && <p className="text-on-surface-variant font-label-sm uppercase">Cargando...</p>}
        {url && <img src={url} alt="Prueba de recepcion" className="w-full max-h-[70vh] object-contain" />}
      </div>
    </div>
  );
}
