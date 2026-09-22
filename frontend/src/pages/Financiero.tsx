import { useEffect, useState } from "react";
import { listObras } from "../lib/obras";
import { listHistorial } from "../lib/historial";
import { getAbonoCliente } from "../lib/abonosCliente";
import { getGastoAdicional } from "../lib/gastosAdicionales";
import { listPrestamos } from "../lib/prestamos";
import { displayCurrency } from "../lib/currency";
import type { Obra } from "../types/obra";
import type { HistorialEvento } from "../types/historial";
import type { Prestamo } from "../types/prestamo";
import { IngresoModal } from "../components/financiero/IngresoModal";
import { EgresoModal } from "../components/financiero/EgresoModal";
import { ReciboCajaModal, type ReciboCajaData } from "../components/obras/ReciboCajaModal";
import { ComprobanteEgresoModal, type ComprobanteEgresoData } from "../components/financiero/ComprobanteEgresoModal";
import { Pagination } from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";

const HISTORIAL_FINANCIERO_TIPOS = [
  "ABONO_REGISTRADO",
  "ABONO_CLIENTE_REGISTRADO",
  "GASTO_ADICIONAL_REGISTRADO",
  "ETAPA_PAGADA",
  "PRESTAMO_REGISTRADO",
  "PRESTAMO_PAGO_REGISTRADO",
] as const;

const HISTORIAL_META: Record<(typeof HISTORIAL_FINANCIERO_TIPOS)[number], { label: string; icon: string; kind: "ingreso" | "egreso" }> = {
  ABONO_REGISTRADO: { label: "Abono a proveedor", icon: "local_shipping", kind: "egreso" },
  ABONO_CLIENTE_REGISTRADO: { label: "Abono de cliente", icon: "receipt_long", kind: "ingreso" },
  GASTO_ADICIONAL_REGISTRADO: { label: "Gasto / pago", icon: "request_quote", kind: "egreso" },
  ETAPA_PAGADA: { label: "Pago a contratista", icon: "engineering", kind: "egreso" },
  PRESTAMO_REGISTRADO: { label: "Prestamo recibido", icon: "account_balance", kind: "ingreso" },
  PRESTAMO_PAGO_REGISTRADO: { label: "Pago de prestamo", icon: "account_balance_wallet", kind: "egreso" },
};

const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
};
const FORMA_PAGO_LABEL: Record<string, string> = { CONTADO: "Contado", CREDITO: "Credito" };

export function Financiero() {
  const [valuesVisible, setValuesVisible] = useState(false);
  const [obras, setObras] = useState<Obra[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);

  const [historial, setHistorial] = useState<HistorialEvento[]>([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(true);
  const [historialError, setHistorialError] = useState<string | null>(null);

  const [isRegisteringIngreso, setIsRegisteringIngreso] = useState(false);
  const [isRegisteringEgreso, setIsRegisteringEgreso] = useState(false);
  const [reciboActivo, setReciboActivo] = useState<ReciboCajaData | null>(null);
  const [comprobanteActivo, setComprobanteActivo] = useState<ComprobanteEgresoData | null>(null);

  useEffect(() => {
    listObras({}).then(setObras).catch(() => setObras([]));
    listPrestamos().then(setPrestamos).catch(() => setPrestamos([]));
    refreshHistorial();
  }, []);

  function refreshHistorial() {
    setIsLoadingHistorial(true);
    listHistorial({ tipos: [...HISTORIAL_FINANCIERO_TIPOS] })
      .then(setHistorial)
      .catch(() => setHistorial([]))
      .finally(() => setIsLoadingHistorial(false));
  }

  function refreshAll() {
    refreshHistorial();
    listPrestamos().then(setPrestamos).catch(() => setPrestamos([]));
  }

  function handleIngresoCreated(recibo: ReciboCajaData) {
    setIsRegisteringIngreso(false);
    setReciboActivo(recibo);
    refreshAll();
  }

  function handleEgresoCreated(comprobante: ComprobanteEgresoData) {
    setIsRegisteringEgreso(false);
    setComprobanteActivo(comprobante);
    refreshAll();
  }

  const { pageItems: pageHistorial, ...historialPagination } = usePagination(historial);

  async function handleVerComprobante(evento: HistorialEvento) {
    setHistorialError(null);
    try {
      if (evento.tipo === "ABONO_CLIENTE_REGISTRADO" && evento.abonoClienteId) {
        const abono = await getAbonoCliente(evento.abonoClienteId);
        const obra = obras.find((o) => o.id === evento.obraId);
        setReciboActivo({
          numero: abono.id.slice(0, 8).toUpperCase(),
          fecha: abono.createdAt,
          recibimosDe: obra?.client ?? "Cliente",
          referencia: `${evento.obraName ?? "Obra"}${obra?.proyectoName ? ` - ${obra.proyectoName}` : ""}`,
          registradoPor: abono.createdByName,
          formaPago: abono.formaPago ? FORMA_PAGO_LABEL[abono.formaPago] : null,
          metodoPago: abono.metodoPago ? METODO_PAGO_LABEL[abono.metodoPago] : null,
          amount: abono.amount,
          notes: abono.notes,
        });
      } else if (evento.tipo === "GASTO_ADICIONAL_REGISTRADO" && evento.gastoAdicionalId) {
        const gasto = await getGastoAdicional(evento.gastoAdicionalId);
        setComprobanteActivo({
          numero: gasto.id.slice(0, 8).toUpperCase(),
          fecha: gasto.createdAt,
          concepto: gasto.concepto,
          referencia: gasto.tipo === "EMPLEADO" ? gasto.empleadoNombre ?? "Empleado" : gasto.obraName ?? "General (sin obra)",
          registradoPor: gasto.createdByName,
          metodoPago: METODO_PAGO_LABEL[gasto.metodoPago] ?? gasto.metodoPago,
          amount: gasto.amount,
          notes: gasto.notes,
        });
      } else if (evento.tipo === "PRESTAMO_REGISTRADO" && evento.prestamoId) {
        const prestamo = prestamos.find((p) => p.id === evento.prestamoId);
        if (!prestamo) return;
        setReciboActivo({
          numero: prestamo.id.slice(0, 8).toUpperCase(),
          fecha: prestamo.createdAt,
          recibimosDe: prestamo.lender,
          referencia: "Prestamo recibido",
          registradoPor: prestamo.createdByName,
          metodoPago: METODO_PAGO_LABEL[prestamo.metodoPago] ?? prestamo.metodoPago,
          amount: prestamo.amount,
          notes: prestamo.notes,
        });
      } else if (evento.tipo === "PRESTAMO_PAGO_REGISTRADO" && evento.prestamoPagoId) {
        const prestamo = prestamos.find((p) => p.pagos.some((pago) => pago.id === evento.prestamoPagoId));
        const pago = prestamo?.pagos.find((p) => p.id === evento.prestamoPagoId);
        if (!prestamo || !pago) return;
        setComprobanteActivo({
          numero: pago.id.slice(0, 8).toUpperCase(),
          fecha: pago.createdAt,
          concepto: "Pago de prestamo",
          referencia: prestamo.lender,
          registradoPor: pago.createdByName,
          metodoPago: METODO_PAGO_LABEL[pago.metodoPago] ?? pago.metodoPago,
          amount: pago.amount,
          notes: pago.notes,
        });
      }
    } catch {
      setHistorialError("No se pudo cargar el comprobante.");
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Financiero</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            Registra ingresos y egresos de la empresa. Para ver saldos y deudas, usa Reportes.
          </p>
        </div>
        <button
          onClick={() => setValuesVisible((prev) => !prev)}
          className="border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2 self-start"
        >
          <span className="material-symbols-outlined text-[18px]">{valuesVisible ? "visibility_off" : "visibility"}</span>
          {valuesVisible ? "Ocultar valores" : "Mostrar valores"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <button
          onClick={() => setIsRegisteringIngreso(true)}
          className="bg-surface-container lux-card-border p-6 md:p-8 text-left hover:border-primary transition-colors flex items-center gap-4"
        >
          <span className="material-symbols-outlined text-primary text-[36px]">arrow_circle_down</span>
          <div>
            <p className="text-headline-md-mobile text-on-surface uppercase">Ingreso</p>
            <p className="font-body-md text-on-surface-variant mt-1">Abono de cliente o prestamo recibido - genera un recibo de caja.</p>
          </div>
        </button>
        <button
          onClick={() => setIsRegisteringEgreso(true)}
          className="bg-surface-container lux-card-border p-6 md:p-8 text-left hover:border-primary transition-colors flex items-center gap-4"
        >
          <span className="material-symbols-outlined text-primary text-[36px]">arrow_circle_up</span>
          <div>
            <p className="text-headline-md-mobile text-on-surface uppercase">Egreso</p>
            <p className="font-body-md text-on-surface-variant mt-1">
              Pago a proveedor, contratista, empleado o gasto general - genera un comprobante de egreso.
            </p>
          </div>
        </button>
      </div>

      <section className="bg-surface-container lux-card-border p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
          <span className="material-symbols-outlined text-primary">history</span>
          <h3 className="text-headline-md-mobile text-on-surface uppercase">Historial financiero</h3>
        </div>

        {historialError && <p className="text-error font-label-sm uppercase mb-4">{historialError}</p>}
        {isLoadingHistorial && <p className="font-label-sm uppercase text-on-surface-variant mb-6">Cargando...</p>}

        {!isLoadingHistorial && historial.length === 0 && (
          <p className="text-on-surface-variant/60 font-label-sm uppercase px-2 py-6">Sin movimientos registrados</p>
        )}

        <div className="flex flex-col gap-3">
          {!isLoadingHistorial &&
            pageHistorial.map((evento) => {
              const meta = HISTORIAL_META[evento.tipo as (typeof HISTORIAL_FINANCIERO_TIPOS)[number]];
              const fecha = new Date(evento.createdAt);
              const hasComprobante =
                (evento.tipo === "ABONO_CLIENTE_REGISTRADO" && evento.abonoClienteId) ||
                (evento.tipo === "GASTO_ADICIONAL_REGISTRADO" && evento.gastoAdicionalId) ||
                (evento.tipo === "PRESTAMO_REGISTRADO" && evento.prestamoId) ||
                (evento.tipo === "PRESTAMO_PAGO_REGISTRADO" && evento.prestamoPagoId);
              return (
                <div
                  key={evento.id}
                  className="border border-outline-variant bg-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex items-center gap-3 sm:w-48 shrink-0">
                    <span className={`material-symbols-outlined ${meta?.kind === "ingreso" ? "text-primary" : "text-secondary"}`}>
                      {meta?.icon ?? "payments"}
                    </span>
                    <div>
                      <p className={`font-label-sm uppercase ${meta?.kind === "ingreso" ? "text-primary" : "text-secondary"}`}>
                        {meta?.label ?? evento.tipo}
                      </p>
                      <p className="font-label-sm text-on-surface-variant/70">
                        {fecha.toLocaleDateString("es-CO")}{" "}
                        {fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface">{evento.descripcion}</p>
                    {evento.userName && (
                      <p className="font-label-sm text-on-surface-variant/70 uppercase mt-1">Por {evento.userName}</p>
                    )}
                  </div>

                  {evento.monto !== null && (
                    <div className="font-body-md font-semibold text-primary sm:text-right shrink-0">
                      {displayCurrency(evento.monto, valuesVisible)}
                    </div>
                  )}

                  {hasComprobante && (
                    <button
                      onClick={() => handleVerComprobante(evento)}
                      className="font-label-sm uppercase text-primary hover:text-primary-fixed transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      Ver comprobante
                    </button>
                  )}
                </div>
              );
            })}
        </div>
        <Pagination {...historialPagination} onPageChange={historialPagination.setPage} />
      </section>

      {isRegisteringIngreso && (
        <IngresoModal obras={obras} onClose={() => setIsRegisteringIngreso(false)} onCreated={handleIngresoCreated} />
      )}

      {isRegisteringEgreso && (
        <EgresoModal obras={obras} onClose={() => setIsRegisteringEgreso(false)} onCreated={handleEgresoCreated} />
      )}

      {reciboActivo && <ReciboCajaModal recibo={reciboActivo} onClose={() => setReciboActivo(null)} />}

      {comprobanteActivo && (
        <ComprobanteEgresoModal comprobante={comprobanteActivo} onClose={() => setComprobanteActivo(null)} />
      )}
    </div>
  );
}
