import { type FormEvent, useState } from "react";
import type { Asignacion, AsignacionInput, EtapaInput } from "../../types/asignacion";
import type { Contratista } from "../../types/contratista";

interface AsignacionFormModalProps {
  obraId: string;
  obraName: string;
  asignacion: Asignacion | null;
  contratistas: Contratista[];
  onClose: () => void;
  onSubmit: (input: AsignacionInput) => Promise<void>;
}

interface DraftEtapa extends EtapaInput {
  key: string;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function draftEtapasFrom(asignacion: Asignacion | null): DraftEtapa[] {
  if (!asignacion) {
    return [{ key: crypto.randomUUID(), name: "", percentage: 0 }];
  }
  return asignacion.etapas.map((etapa) => ({ key: etapa.id, name: etapa.name, percentage: etapa.percentage }));
}

export function AsignacionFormModal({
  obraId,
  obraName,
  asignacion,
  contratistas,
  onClose,
  onSubmit,
}: AsignacionFormModalProps) {
  const locked = Boolean(asignacion && asignacion.etapas.some((e) => e.status !== "PENDIENTE"));

  const [contratistaId, setContratistaId] = useState(asignacion?.contratistaId ?? contratistas[0]?.id ?? "");
  const [totalAmount, setTotalAmount] = useState(asignacion?.totalAmount ?? 0);
  const [notes, setNotes] = useState(asignacion?.notes ?? "");
  const [etapas, setEtapas] = useState<DraftEtapa[]>(draftEtapasFrom(asignacion));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";
  const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

  const percentageSum = etapas.reduce((sum, etapa) => sum + (etapa.percentage || 0), 0);
  const sumIsValid = Math.abs(percentageSum - 100) < 0.01;

  function updateEtapa(key: string, patch: Partial<DraftEtapa>) {
    setEtapas((prev) => prev.map((etapa) => (etapa.key === key ? { ...etapa, ...patch } : etapa)));
  }

  function addEtapa() {
    setEtapas((prev) => [...prev, { key: crypto.randomUUID(), name: "", percentage: 0 }]);
  }

  function removeEtapa(key: string) {
    setEtapas((prev) => (prev.length > 1 ? prev.filter((etapa) => etapa.key !== key) : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!locked) {
      const validEtapas = etapas.filter((etapa) => etapa.name.trim() && etapa.percentage > 0);
      if (validEtapas.length === 0) {
        setError("Agrega al menos una etapa con nombre y porcentaje validos.");
        return;
      }
      const sum = validEtapas.reduce((total, etapa) => total + etapa.percentage, 0);
      if (Math.abs(sum - 100) > 0.01) {
        setError(`Las etapas deben sumar 100% (actualmente suman ${sum.toFixed(2)}%).`);
        return;
      }
    }
    if (!contratistaId) {
      setError("Selecciona un contratista.");
      return;
    }
    if (totalAmount <= 0) {
      setError("El monto total debe ser mayor a cero.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        obraId,
        contratistaId,
        totalAmount,
        notes: notes || null,
        etapas: locked
          ? asignacion!.etapas.map((etapa) => ({ name: etapa.name, percentage: etapa.percentage }))
          : etapas
              .filter((etapa) => etapa.name.trim() && etapa.percentage > 0)
              .map(({ name, percentage }) => ({ name, percentage })),
      });
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo guardar la asignacion.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">
            {asignacion ? "Editar asignacion" : "Asignar contratista"}
          </h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-8">Obra: {obraName}</p>

        {locked && (
          <p className="font-label-sm text-secondary uppercase mb-6 border border-secondary p-3">
            Esta asignacion ya tiene etapas completadas o pagadas: las etapas no se pueden modificar, solo el monto y
            las notas.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <label className={labelClass}>Contratista</label>
            <select
              className={inputClass}
              value={contratistaId}
              disabled={Boolean(asignacion)}
              onChange={(e) => setContratistaId(e.target.value)}
            >
              {contratistas.length === 0 && <option value="">No hay contratistas activos</option>}
              {contratistas.map((contratista) => (
                <option key={contratista.id} value={contratista.id}>
                  {contratista.name} {contratista.oficio ? `(${contratista.oficio})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Monto total del contrato (COP)</label>
            <input
              type="number"
              min={0}
              step="1"
              className={inputClass}
              value={totalAmount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const raw = e.target.value.replace(/^0+(?=\d)/, "");
                const parsed = raw === "" ? 0 : Number(raw);
                setTotalAmount(Number.isNaN(parsed) ? 0 : parsed);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notas</label>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-3">
          <h4 className="font-label-sm text-on-surface-variant uppercase tracking-widest">Etapas de pago</h4>
          {!locked && (
            <button
              type="button"
              onClick={addEtapa}
              className="font-label-sm uppercase text-primary hover:text-primary-fixed flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Agregar etapa
            </button>
          )}
        </div>

        {locked ? (
          <div className="flex flex-col gap-2 mb-6">
            {asignacion!.etapas.map((etapa) => (
              <div key={etapa.id} className="flex justify-between text-body-md text-on-surface-variant">
                <span>
                  {etapa.name} - {etapa.percentage}%
                </span>
                <span>{currencyFormatter.format(etapa.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-2">
            {etapas.map((etapa) => (
              <div key={etapa.key} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className={labelClass}>Nombre de la etapa</label>
                  <input
                    className={inputClass}
                    placeholder="Ej. Instalacion de tuberia"
                    value={etapa.name}
                    onChange={(e) => updateEtapa(etapa.key, { name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Porcentaje (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className={inputClass}
                    value={etapa.percentage}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, "");
                      const parsed = raw === "" ? 0 : Number(raw);
                      updateEtapa(etapa.key, { percentage: Number.isNaN(parsed) ? 0 : parsed });
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Monto</label>
                  <p className="font-body-md text-on-surface py-3">
                    {currencyFormatter.format((totalAmount * (etapa.percentage || 0)) / 100)}
                  </p>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeEtapa(etapa.key)}
                    className="text-on-surface-variant hover:text-error transition-colors"
                    title="Quitar"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!locked && (
          <p className={`font-label-sm uppercase mb-6 ${sumIsValid ? "text-primary" : "text-error"}`}>
            Suma de porcentajes: {percentageSum.toFixed(2)}% {sumIsValid ? "" : "(debe ser 100%)"}
          </p>
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
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
