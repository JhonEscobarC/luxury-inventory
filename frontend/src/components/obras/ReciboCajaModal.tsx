import { createPortal } from "react-dom";
import type { AbonoCliente } from "../../types/abonoCliente";
import type { Obra } from "../../types/obra";

interface ReciboCajaModalProps {
  abono: AbonoCliente;
  obra: Obra;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ReciboCajaModal({ abono, obra, onClose }: ReciboCajaModalProps) {
  const numero = abono.id.slice(0, 8).toUpperCase();
  const fecha = new Date(abono.createdAt);

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
          #recibo-print-area {
            position: static !important;
            width: 100% !important;
            margin: 0; padding: 24px;
            background: #ffffff !important; box-shadow: none !important; border: none !important;
          }
          #recibo-print-area * {
            color: #1a1a1a !important;
            border-color: #999999 !important;
            background-color: transparent !important;
          }
          #recibo-print-area .text-primary { color: #8a6d1f !important; }
        }
      `}</style>

      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden" onClick={onClose} />

      <div className="comprobante-shell relative w-full max-w-2xl bg-surface-container border border-outline-variant max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 md:p-8 pb-0 print:hidden">
          <h3 className="text-headline-md-mobile text-primary uppercase">Recibo de caja</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div id="recibo-print-area" className="p-6 md:p-8 bg-surface-container text-on-surface">
          <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
            <div>
              <p className="font-body-lg font-bold uppercase text-primary">LUXURY</p>
              <p className="font-label-sm text-on-surface-variant uppercase">Diseno y Construccion</p>
            </div>
            <div className="text-right">
              <p className="font-label-sm uppercase text-on-surface-variant">Recibo de caja</p>
              <p className="font-body-lg font-bold text-primary">N.° {numero}</p>
              <p className="font-label-sm text-on-surface-variant">{fecha.toLocaleDateString("es-CO")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 font-body-md">
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase">Recibimos de</p>
              <p>{obra.client ?? "-"}</p>
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase">Obra / Proyecto</p>
              <p>
                {obra.name}
                {obra.proyectoName ? ` - ${obra.proyectoName}` : ""}
              </p>
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase">Registrado por</p>
              <p>{abono.createdByName ?? "-"}</p>
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase">Fecha y hora</p>
              <p>{fecha.toLocaleString("es-CO")}</p>
            </div>
          </div>

          <div className="border border-outline-variant p-6 mb-8 text-center">
            <p className="font-label-sm text-on-surface-variant uppercase mb-2">Valor recibido</p>
            <p className="text-headline-md text-primary font-bold">{currencyFormatter.format(abono.amount)}</p>
          </div>

          {abono.notes && (
            <p className="font-body-md text-on-surface-variant mb-8">
              <span className="font-label-sm uppercase">Concepto: </span>
              {abono.notes}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center mt-10">
            <div>
              <div className="border-t border-on-surface-variant pt-2">
                <p className="font-label-sm text-on-surface-variant uppercase">Entregado por</p>
              </div>
            </div>
            <div>
              <div className="border-t border-on-surface-variant pt-2">
                <p className="font-label-sm text-on-surface-variant uppercase">Recibido por</p>
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
            Imprimir recibo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
