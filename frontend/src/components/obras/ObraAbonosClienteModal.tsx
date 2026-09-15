import { type FormEvent, useEffect, useState } from "react";
import { createAbonoCliente, listAbonosCliente } from "../../lib/abonosCliente";
import type { AbonoCliente } from "../../types/abonoCliente";
import type { Obra } from "../../types/obra";
import { ReciboCajaModal } from "./ReciboCajaModal";

interface ObraAbonosClienteModalProps {
  obra: Obra;
  onClose: () => void;
  onChanged?: () => void;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ObraAbonosClienteModal({ obra, onClose, onChanged }: ObraAbonosClienteModalProps) {
  const [abonos, setAbonos] = useState<AbonoCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptAbono, setReceiptAbono] = useState<AbonoCliente | null>(null);

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
  const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

  async function refresh() {
    setIsLoading(true);
    try {
      setAbonos(await listAbonosCliente(obra.id));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra.id]);

  const totalAbonado = abonos.reduce((sum, a) => sum + a.amount, 0);
  const saldoPendiente = obra.precioVenta !== null ? obra.precioVenta - totalAbonado : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }
    if (saldoPendiente !== undefined && value > saldoPendiente) {
      setError(`El abono no puede superar el saldo pendiente (${currencyFormatter.format(saldoPendiente)})`);
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createAbonoCliente({ obraId: obra.id, amount: value, notes: notes || null });
      setAmount("");
      setNotes("");
      await refresh();
      onChanged?.();
      setReceiptAbono(created);
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo registrar el abono.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">Abonos de cliente - {obra.name}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary shrink-0">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase mb-1">
          {obra.client ? `Comprador: ${obra.client}` : "Sin comprador asignado en la obra"}
        </p>
        <p className="font-label-sm text-on-surface-variant uppercase mb-8">
          Total abonado: <span className="text-primary">{currencyFormatter.format(totalAbonado)}</span>
          {obra.precioVenta !== null && (
            <>
              {" "}
              &middot; Precio de venta: <span>{currencyFormatter.format(obra.precioVenta)}</span> &middot; Saldo
              pendiente:{" "}
              <span className={(saldoPendiente ?? 0) > 0 ? "text-error" : "text-on-surface-variant"}>
                {currencyFormatter.format(saldoPendiente ?? 0)}
              </span>
            </>
          )}
          {obra.precioVenta === null && " · Sin precio de venta definido para esta obra"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end mb-8">
          <div className="flex-1 w-full">
            <label className={labelClass}>Monto del abono</label>
            <input
              type="number"
              min="0"
              max={saldoPendiente}
              step="1"
              className={inputClass}
              value={amount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(e.target.value.replace(/^0+(?=\d)/, ""))}
              placeholder="0"
            />
          </div>
          <div className="flex-1 w-full">
            <label className={labelClass}>Notas (opcional)</label>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary-container text-on-primary font-label-sm uppercase py-3 px-6 hover:bg-primary-fixed transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {isSubmitting ? "Guardando..." : "Registrar abono"}
          </button>
        </form>

        {error && <p className="text-error font-label-sm uppercase tracking-wider mb-6">{error}</p>}

        <div className="flex flex-col gap-3">
          <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest px-2">
            <div className="col-span-3">Fecha</div>
            <div className="col-span-2">Monto</div>
            <div className="col-span-4">Notas</div>
            <div className="col-span-2">Registrado por</div>
            <div className="col-span-1 text-right">Recibo</div>
          </div>
          {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-2 py-6">Cargando...</p>}
          {!isLoading && abonos.length === 0 && (
            <p className="text-on-surface-variant/60 font-label-sm uppercase px-2 py-6">Sin abonos registrados</p>
          )}
          {!isLoading &&
            abonos.map((abono) => (
              <div
                key={abono.id}
                className="border border-outline-variant p-3 md:px-2 md:py-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
              >
                <div className="md:col-span-3 font-body-md text-on-surface-variant">
                  {new Date(abono.createdAt).toLocaleDateString("es-CO")}
                </div>
                <div className="md:col-span-2 font-body-md font-semibold text-primary">
                  {currencyFormatter.format(abono.amount)}
                </div>
                <div className="md:col-span-4 font-body-md text-on-surface-variant">{abono.notes || "-"}</div>
                <div className="md:col-span-2 font-label-sm uppercase text-on-surface-variant">
                  {abono.createdByName || "-"}
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setReceiptAbono(abono)}
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    title="Ver recibo de caja"
                  >
                    <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {receiptAbono && (
        <ReciboCajaModal abono={receiptAbono} obra={obra} onClose={() => setReceiptAbono(null)} />
      )}
    </div>
  );
}
