import { type FormEvent, useEffect, useState } from "react";
import { createAbonoCliente, getObraSaldoCliente } from "../../lib/abonosCliente";
import { createPrestamo } from "../../lib/prestamos";
import { currencyFormatter } from "../../lib/currency";
import type { AbonoCliente } from "../../types/abonoCliente";
import type { FormaPago } from "../../types/order";
import type { MetodoPago } from "../../types/abonoCliente";
import type { Obra } from "../../types/obra";
import type { Prestamo } from "../../types/prestamo";
import type { ReciboCajaData } from "../obras/ReciboCajaModal";

type IngresoTipo = "CLIENTE" | "PRESTAMO";

interface IngresoModalProps {
  obras: Obra[];
  onClose: () => void;
  onCreated: (recibo: ReciboCajaData) => void;
}

const FORMA_PAGO_OPTIONS: { value: FormaPago; label: string }[] = [
  { value: "CONTADO", label: "Contado" },
  { value: "CREDITO", label: "Credito" },
];
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
const FORMA_PAGO_LABEL: Record<FormaPago, string> = { CONTADO: "Contado", CREDITO: "Credito" };

const inputClass =
  "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";
const typeButtonClass = (active: boolean) =>
  `text-left border px-4 py-3 transition-colors ${
    active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"
  }`;

export function IngresoModal({ obras, onClose, onCreated }: IngresoModalProps) {
  const [tipo, setTipo] = useState<IngresoTipo>("CLIENTE");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cliente
  const [obraId, setObraId] = useState(obras[0]?.id ?? "");
  const [formaPago, setFormaPago] = useState<FormaPago>("CONTADO");
  const [saldoPendiente, setSaldoPendiente] = useState<number | undefined>(undefined);

  // Prestamo
  const [lender, setLender] = useState("");

  useEffect(() => {
    if (tipo !== "CLIENTE" || !obraId) return;
    getObraSaldoCliente(obraId)
      .then((s) => setSaldoPendiente(s.saldo ?? undefined))
      .catch(() => setSaldoPendiente(undefined));
  }, [tipo, obraId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }

    setIsSubmitting(true);
    try {
      if (tipo === "CLIENTE") {
        if (!obraId) {
          setError("Selecciona una obra");
          setIsSubmitting(false);
          return;
        }
        if (saldoPendiente !== undefined && value > saldoPendiente) {
          setError(`El abono no puede superar el saldo pendiente (${currencyFormatter.format(saldoPendiente)})`);
          setIsSubmitting(false);
          return;
        }
        const obra = obras.find((o) => o.id === obraId);
        const created: AbonoCliente = await createAbonoCliente({
          obraId,
          amount: value,
          notes: notes || null,
          formaPago,
          metodoPago,
        });
        onCreated({
          numero: created.id.slice(0, 8).toUpperCase(),
          fecha: created.createdAt,
          recibimosDe: obra?.client ?? "Cliente",
          referencia: `${obra?.name ?? "Obra"}${obra?.proyectoName ? ` - ${obra.proyectoName}` : ""}`,
          registradoPor: created.createdByName,
          formaPago: FORMA_PAGO_LABEL[formaPago],
          metodoPago: METODO_PAGO_LABEL[metodoPago],
          amount: created.amount,
          notes: created.notes,
        });
      } else {
        if (!lender.trim()) {
          setError("Indica de quien se recibio el prestamo");
          setIsSubmitting(false);
          return;
        }
        const created: Prestamo = await createPrestamo({
          amount: value,
          lender: lender.trim(),
          notes: notes || null,
          metodoPago,
        });
        onCreated({
          numero: created.id.slice(0, 8).toUpperCase(),
          fecha: created.createdAt,
          recibimosDe: created.lender,
          referencia: "Prestamo recibido",
          registradoPor: created.createdByName,
          metodoPago: METODO_PAGO_LABEL[metodoPago],
          amount: created.amount,
          notes: created.notes,
        });
      }
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo registrar el ingreso.";
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
          <h3 className="text-headline-md-mobile text-primary uppercase">Nuevo ingreso</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <button type="button" onClick={() => setTipo("CLIENTE")} className={typeButtonClass(tipo === "CLIENTE")}>
            <span className="font-label-sm uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              Abono de cliente
            </span>
            <span className="font-body-md text-on-surface-variant/80 block mt-1">Pago recibido por la venta de una obra</span>
          </button>
          <button type="button" onClick={() => setTipo("PRESTAMO")} className={typeButtonClass(tipo === "PRESTAMO")}>
            <span className="font-label-sm uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
              Prestamo recibido
            </span>
            <span className="font-body-md text-on-surface-variant/80 block mt-1">Dinero prestado a la empresa</span>
          </button>
        </div>

        {tipo === "CLIENTE" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelClass}>Obra</label>
              <select className={inputClass} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                {obras.length === 0 && <option value="">No hay obras</option>}
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.name}
                  </option>
                ))}
              </select>
              {saldoPendiente !== undefined && (
                <p className="font-label-sm text-on-surface-variant/70 uppercase mt-2">
                  Saldo pendiente: {currencyFormatter.format(saldoPendiente)}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Forma de pago</label>
              <select className={inputClass} value={formaPago} onChange={(e) => setFormaPago(e.target.value as FormaPago)}>
                {FORMA_PAGO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <label className={labelClass}>Recibimos de (persona o entidad)</label>
            <input className={inputClass} value={lender} onChange={(e) => setLender(e.target.value)} placeholder="Ej. Banco XYZ, Juan Perez..." />
          </div>
        )}

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
            {isSubmitting ? "Guardando..." : "Registrar ingreso"}
          </button>
        </div>
      </form>
    </div>
  );
}
