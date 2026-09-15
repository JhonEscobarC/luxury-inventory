import { createPortal } from "react-dom";
import type { Order } from "../../types/order";

interface ComprobanteModalProps {
  order: Order;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ComprobanteModal({ order, onClose }: ComprobanteModalProps) {
  const esContado = order.formaPago === "CONTADO";
  const tipoComprobante = esContado ? "Comprobante de Egreso" : "Comprobante de Contabilidad";
  const numero = order.id.slice(0, 8).toUpperCase();
  const fecha = new Date(order.updatedAt);

  return createPortal(
    <div className="comprobante-overlay fixed inset-0 z-[90] flex items-center justify-center p-margin-mobile">
      <style>{`
        @media print {
          body > *:not(.comprobante-overlay) { display: none !important; }
          body { background: #ffffff !important; }

          .comprobante-overlay {
            position: static !important;
            height: auto !important;
            padding: 0 !important;
            display: block !important;
          }
          .comprobante-shell {
            position: static !important;
            max-height: none !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
          #comprobante-print-area {
            position: static !important;
            width: 100% !important;
            margin: 0; padding: 24px;
            background: #ffffff !important; box-shadow: none !important; border: none !important;
          }
          #comprobante-print-area * {
            color: #1a1a1a !important;
            border-color: #999999 !important;
            background-color: transparent !important;
          }
          #comprobante-print-area .text-primary { color: #8a6d1f !important; }
          #comprobante-print-area .overflow-x-auto { overflow: visible !important; }
          #comprobante-print-area table { min-width: 0 !important; width: 100% !important; }
        }
      `}</style>

      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden" onClick={onClose} />

      <div className="comprobante-shell relative w-full max-w-3xl bg-surface-container border border-outline-variant max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 md:p-8 pb-0 print:hidden">
          <h3 className="text-headline-md-mobile text-primary uppercase">{tipoComprobante}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div id="comprobante-print-area" className="p-6 md:p-8 bg-surface-container text-on-surface">
          <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
            <div>
              <p className="font-body-lg font-bold uppercase text-primary">LUXURY</p>
              <p className="font-label-sm text-on-surface-variant uppercase">Diseno y Construccion</p>
            </div>
            <div className="text-right">
              <p className="font-label-sm uppercase text-on-surface-variant">{tipoComprobante}</p>
              <p className="font-body-lg font-bold text-primary">N.° {numero}</p>
              <p className="font-label-sm text-on-surface-variant">{fecha.toLocaleDateString("es-CO")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 font-body-md">
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase">Obra</p>
              <p>{order.obraName}</p>
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase">Proveedor</p>
              <p>{order.proveedorName ?? (order.hasMultipleProveedores ? "Varios (ver detalle)" : "-")}</p>
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase">Forma de pago</p>
              <p>{esContado ? "Contado" : "Credito"}</p>
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase">Autorizado por</p>
              <p>{order.assignedByName ?? "-"}</p>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full min-w-[560px] font-body-md border-collapse">
              <thead>
                <tr className="border-b border-outline-variant font-label-sm text-on-surface-variant uppercase">
                  <th className="text-left py-2">Descripcion</th>
                  <th className="text-left py-2">Categoria</th>
                  {order.hasMultipleProveedores && <th className="text-left py-2">Proveedor</th>}
                  <th className="text-right py-2">Cantidad</th>
                  <th className="text-right py-2">Precio unit.</th>
                  <th className="text-right py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-outline-variant/50">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2">{item.categoriaName ?? "-"}</td>
                    {order.hasMultipleProveedores && <td className="py-2">{item.proveedorName ?? "-"}</td>}
                    <td className="py-2 text-right whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {item.unitPrice !== null ? currencyFormatter.format(item.unitPrice) : "-"}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {item.subtotal !== null ? currencyFormatter.format(item.subtotal) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-64">
              <div className="flex justify-between font-body-lg font-bold border-t-2 border-primary pt-2">
                <span className="uppercase">Total</span>
                <span className="text-primary">{currencyFormatter.format(order.total ?? 0)}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <p className="font-body-md text-on-surface-variant mb-8">
              <span className="font-label-sm uppercase">Notas: </span>
              {order.notes}
            </p>
          )}

          <p className="font-label-sm text-on-surface-variant uppercase mb-10">
            {esContado
              ? "Este comprobante certifica un egreso pagado de contado, sin saldo pendiente con el proveedor."
              : "Este comprobante certifica una compra a credito; el saldo queda registrado como deuda con el proveedor hasta su pago."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t border-on-surface-variant pt-2">
                <p className="font-label-sm text-on-surface-variant uppercase">Elaborado por</p>
              </div>
            </div>
            <div>
              <div className="border-t border-on-surface-variant pt-2">
                <p className="font-label-sm text-on-surface-variant uppercase">Autorizado por</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-6 md:p-8 pt-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-outline-variant text-on-surface-variant font-label-sm uppercase py-3 hover:border-primary hover:text-primary transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 bg-primary-container text-on-primary font-label-sm uppercase py-3 hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Imprimir comprobante
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
