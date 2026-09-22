import { type FormEvent, useEffect, useState } from "react";
import { listProveedores } from "../../lib/proveedores";
import { getProveedoresDeudaReport } from "../../lib/reports";
import { createAbono } from "../../lib/abonos";
import { listAsignaciones, updateEtapaStatus } from "../../lib/asignaciones";
import { createGastoAdicional } from "../../lib/gastosAdicionales";
import { listPrestamos, createPrestamoPago } from "../../lib/prestamos";
import { currencyFormatter } from "../../lib/currency";
import type { Proveedor } from "../../types/proveedor";
import type { ProveedorDeuda } from "../../types/report";
import type { Asignacion } from "../../types/asignacion";
import type { Obra } from "../../types/obra";
import type { Prestamo } from "../../types/prestamo";
import type { MetodoPago } from "../../types/abonoCliente";
import type { ComprobanteEgresoData } from "./ComprobanteEgresoModal";

type EgresoTipo = "PROVEEDOR" | "CONTRATISTA" | "EMPLEADO" | "GASTO" | "PRESTAMO";

interface EgresoModalProps {
  obras: Obra[];
  onClose: () => void;
  onCreated: (comprobante: ComprobanteEgresoData) => void;
}

const METODO_PAGO_OPTIONS: { value: MetodoPago; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
];
const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
};

const TIPOS: { value: EgresoTipo; label: string; icon: string }[] = [
  { value: "PROVEEDOR", label: "Proveedor", icon: "local_shipping" },
  { value: "CONTRATISTA", label: "Contratista", icon: "engineering" },
  { value: "EMPLEADO", label: "Empleado", icon: "badge" },
  { value: "GASTO", label: "Gasto general", icon: "request_quote" },
  { value: "PRESTAMO", label: "Pago de prestamo", icon: "account_balance" },
];

const inputClass =
  "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";
const typeButtonClass = (active: boolean) =>
  `text-left border px-3 py-3 transition-colors ${
    active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"
  }`;

interface EtapaPendienteOption {
  asignacionId: string;
  etapaId: string;
  label: string;
  amount: number;
}

export function EgresoModal({ obras, onClose, onCreated }: EgresoModalProps) {
  const [tipo, setTipo] = useState<EgresoTipo>("PROVEEDOR");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proveedor
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [deudas, setDeudas] = useState<ProveedorDeuda[]>([]);
  const [proveedorId, setProveedorId] = useState("");

  // Contratista
  const [etapasPendientes, setEtapasPendientes] = useState<EtapaPendienteOption[]>([]);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState("");

  // Empleado / Gasto
  const [concepto, setConcepto] = useState("");
  const [empleadoNombre, setEmpleadoNombre] = useState("");
  const [obraId, setObraId] = useState("");

  // Prestamo
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [prestamoId, setPrestamoId] = useState("");

  useEffect(() => {
    if (tipo === "PROVEEDOR" && proveedores.length === 0) {
      listProveedores({ isActive: true }).then(setProveedores).catch(() => setProveedores([]));
      getProveedoresDeudaReport().then(setDeudas).catch(() => setDeudas([]));
    }
    if (tipo === "CONTRATISTA" && etapasPendientes.length === 0) {
      listAsignaciones({}).then((asignaciones: Asignacion[]) => {
        const options: EtapaPendienteOption[] = [];
        for (const asignacion of asignaciones) {
          for (const etapa of asignacion.etapas) {
            if (etapa.status !== "COMPLETADA") continue;
            options.push({
              asignacionId: asignacion.id,
              etapaId: etapa.id,
              label: `${asignacion.contratistaName} - ${asignacion.obraName} - ${etapa.name}`,
              amount: etapa.amount,
            });
          }
        }
        setEtapasPendientes(options);
      });
    }
    if (tipo === "PRESTAMO" && prestamos.length === 0) {
      listPrestamos().then((all) => setPrestamos(all.filter((p) => p.saldo > 0)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const proveedorSaldo = deudas.find((d) => d.proveedorId === proveedorId)?.saldo;
  const prestamoSeleccionado = prestamos.find((p) => p.id === prestamoId);
  const etapaInfo = etapasPendientes.find((e) => e.asignacionId + e.etapaId === etapaSeleccionada);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (tipo === "CONTRATISTA") {
      if (!etapaInfo) {
        setError("Selecciona la etapa a pagar");
        return;
      }
      setIsSubmitting(true);
      try {
        await updateEtapaStatus(etapaInfo.asignacionId, etapaInfo.etapaId, "PAGADA", metodoPago);
        onCreated({
          numero: etapaInfo.etapaId.slice(0, 8).toUpperCase(),
          fecha: new Date().toISOString(),
          concepto: etapaInfo.label,
          referencia: etapaInfo.label.split(" - ")[0],
          registradoPor: null,
          metodoPago: METODO_PAGO_LABEL[metodoPago],
          amount: etapaInfo.amount,
          notes: null,
        });
      } catch (submitError: unknown) {
        const message =
          (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "No se pudo registrar el pago.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const value = Number(amount);
    if (!value || value <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }

    setIsSubmitting(true);
    try {
      if (tipo === "PROVEEDOR") {
        if (!proveedorId) {
          setError("Selecciona un proveedor");
          return;
        }
        if (proveedorSaldo !== undefined && value > proveedorSaldo) {
          setError(`El abono no puede superar el saldo pendiente (${currencyFormatter.format(proveedorSaldo)})`);
          return;
        }
        const proveedor = proveedores.find((p) => p.id === proveedorId);
        const created = await createAbono({ proveedorId, amount: value, notes: notes || null, metodoPago });
        onCreated({
          numero: created.id.slice(0, 8).toUpperCase(),
          fecha: created.createdAt,
          concepto: "Abono a proveedor",
          referencia: proveedor?.name ?? "Proveedor",
          registradoPor: created.createdByName,
          metodoPago: METODO_PAGO_LABEL[metodoPago],
          amount: created.amount,
          notes: created.notes,
        });
      } else if (tipo === "EMPLEADO") {
        if (!empleadoNombre.trim()) {
          setError("Indica el nombre del empleado");
          return;
        }
        if (!concepto.trim()) {
          setError("Describe el pago");
          return;
        }
        const created = await createGastoAdicional({
          concepto: concepto.trim(),
          amount: value,
          metodoPago,
          notes: notes || null,
          obraId: obraId || null,
          tipo: "EMPLEADO",
          empleadoNombre: empleadoNombre.trim(),
        });
        onCreated({
          numero: created.id.slice(0, 8).toUpperCase(),
          fecha: created.createdAt,
          concepto: created.concepto,
          referencia: created.empleadoNombre ?? empleadoNombre,
          registradoPor: created.createdByName,
          metodoPago: METODO_PAGO_LABEL[metodoPago],
          amount: created.amount,
          notes: created.notes,
        });
      } else if (tipo === "GASTO") {
        if (!concepto.trim()) {
          setError("Describe el gasto");
          return;
        }
        const created = await createGastoAdicional({
          concepto: concepto.trim(),
          amount: value,
          metodoPago,
          notes: notes || null,
          obraId: obraId || null,
          tipo: "GENERAL",
        });
        onCreated({
          numero: created.id.slice(0, 8).toUpperCase(),
          fecha: created.createdAt,
          concepto: created.concepto,
          referencia: created.obraName ?? "General (sin obra)",
          registradoPor: created.createdByName,
          metodoPago: METODO_PAGO_LABEL[metodoPago],
          amount: created.amount,
          notes: created.notes,
        });
      } else {
        if (!prestamoId) {
          setError("Selecciona el prestamo a pagar");
          return;
        }
        if (prestamoSeleccionado && value > prestamoSeleccionado.saldo) {
          setError(`El pago no puede superar el saldo pendiente (${currencyFormatter.format(prestamoSeleccionado.saldo)})`);
          return;
        }
        const created = await createPrestamoPago({ prestamoId, amount: value, metodoPago, notes: notes || null });
        onCreated({
          numero: created.id.slice(0, 8).toUpperCase(),
          fecha: created.createdAt,
          concepto: "Pago de prestamo",
          referencia: prestamoSeleccionado?.lender ?? "Prestamo",
          registradoPor: created.createdByName,
          metodoPago: METODO_PAGO_LABEL[metodoPago],
          amount: created.amount,
          notes: created.notes,
        });
      }
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo registrar el egreso.";
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
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-headline-md-mobile text-primary uppercase">Nuevo egreso</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {TIPOS.map((t) => (
            <button key={t.value} type="button" onClick={() => setTipo(t.value)} className={typeButtonClass(tipo === t.value)}>
              <span className="font-label-sm uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {tipo === "PROVEEDOR" && (
          <div className="mb-6">
            <label className={labelClass}>Proveedor</label>
            <select className={inputClass} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">Selecciona...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {proveedorSaldo !== undefined && (
              <p className="font-label-sm text-on-surface-variant/70 uppercase mt-2">
                Saldo pendiente: {currencyFormatter.format(proveedorSaldo)}
              </p>
            )}
          </div>
        )}

        {tipo === "CONTRATISTA" && (
          <div className="mb-6">
            <label className={labelClass}>Etapa pendiente de pago</label>
            <select className={inputClass} value={etapaSeleccionada} onChange={(e) => setEtapaSeleccionada(e.target.value)}>
              <option value="">Selecciona...</option>
              {etapasPendientes.map((e) => (
                <option key={e.asignacionId + e.etapaId} value={e.asignacionId + e.etapaId}>
                  {e.label} - {currencyFormatter.format(e.amount)}
                </option>
              ))}
            </select>
            {etapasPendientes.length === 0 && (
              <p className="font-label-sm text-on-surface-variant/70 uppercase mt-2">
                No hay etapas completadas pendientes de pago.
              </p>
            )}
          </div>
        )}

        {(tipo === "EMPLEADO" || tipo === "GASTO") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {tipo === "EMPLEADO" && (
              <div>
                <label className={labelClass}>Nombre del empleado</label>
                <input className={inputClass} value={empleadoNombre} onChange={(e) => setEmpleadoNombre(e.target.value)} />
              </div>
            )}
            <div className={tipo === "EMPLEADO" ? "" : "sm:col-span-2"}>
              <label className={labelClass}>Concepto</label>
              <input
                className={inputClass}
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder={tipo === "EMPLEADO" ? "Ej. Quincena de septiembre" : "Ej. Transporte, papeleria..."}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Obra (opcional)</label>
              <select className={inputClass} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                <option value="">General (sin obra)</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {tipo === "PRESTAMO" && (
          <div className="mb-6">
            <label className={labelClass}>Prestamo</label>
            <select className={inputClass} value={prestamoId} onChange={(e) => setPrestamoId(e.target.value)}>
              <option value="">Selecciona...</option>
              {prestamos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lender} - Saldo {currencyFormatter.format(p.saldo)}
                </option>
              ))}
            </select>
            {prestamos.length === 0 && (
              <p className="font-label-sm text-on-surface-variant/70 uppercase mt-2">
                No hay prestamos con saldo pendiente.
              </p>
            )}
          </div>
        )}

        {tipo !== "CONTRATISTA" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div>
              <label className={labelClass}>Monto</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={amount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setAmount(e.target.value.replace(/^0+(?=\d)/, ""))}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Metodo de pago</label>
              <select className={inputClass} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}>
                {METODO_PAGO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Notas (opcional)</label>
              <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {tipo === "CONTRATISTA" && (
          <div className="mb-8">
            <label className={labelClass}>Metodo de pago</label>
            <select className={inputClass} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}>
              {METODO_PAGO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

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
            {isSubmitting ? "Guardando..." : "Registrar egreso"}
          </button>
        </div>
      </form>
    </div>
  );
}
