import { useEffect, useState } from "react";
import { createAsignacion, listAsignaciones, updateAsignacion, updateEtapaStatus } from "../../lib/asignaciones";
import { listContratistas } from "../../lib/contratistas";
import type { Asignacion, AsignacionInput, EtapaStatus } from "../../types/asignacion";
import type { Contratista } from "../../types/contratista";
import type { Obra } from "../../types/obra";
import { AsignacionFormModal } from "./AsignacionFormModal";

interface ObraContratistasModalProps {
  obra: Obra;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ETAPA_STATUS_LABEL: Record<EtapaStatus, string> = {
  PENDIENTE: "Pendiente",
  COMPLETADA: "Completada",
  PAGADA: "Pagada",
};

const ETAPA_STATUS_CLASS: Record<EtapaStatus, string> = {
  PENDIENTE: "border-outline-variant text-on-surface-variant",
  COMPLETADA: "border-tertiary text-tertiary",
  PAGADA: "border-primary text-primary",
};

const NEXT_ETAPA_STATUS: Record<EtapaStatus, EtapaStatus | null> = {
  PENDIENTE: "COMPLETADA",
  COMPLETADA: "PAGADA",
  PAGADA: null,
};

export function ObraContratistasModal({ obra, onClose }: ObraContratistasModalProps) {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [contratistas, setContratistas] = useState<Contratista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingAsignacion, setEditingAsignacion] = useState<Asignacion | null>(null);
  const [pendingEtapaId, setPendingEtapaId] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [asignacionesResult, contratistasResult] = await Promise.all([
        listAsignaciones({ obraId: obra.id }),
        listContratistas({ isActive: true }),
      ]);
      setAsignaciones(asignacionesResult);
      setContratistas(contratistasResult);
    } catch {
      setErrorMessage("No se pudieron cargar los contratistas de esta obra.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra.id]);

  async function handleCreate(input: AsignacionInput) {
    await createAsignacion(input);
    await refresh();
  }

  async function handleUpdate(input: AsignacionInput) {
    if (!editingAsignacion) return;
    await updateAsignacion(editingAsignacion.id, {
      totalAmount: input.totalAmount,
      notes: input.notes,
      etapas: input.etapas,
    });
    await refresh();
  }

  async function handleAdvanceEtapa(asignacionId: string, etapaId: string, nextStatus: EtapaStatus) {
    setPendingEtapaId(etapaId);
    setErrorMessage(null);
    try {
      await updateEtapaStatus(asignacionId, etapaId, nextStatus);
      await refresh();
    } catch {
      setErrorMessage("No se pudo actualizar el estado de la etapa.");
    } finally {
      setPendingEtapaId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">Contratistas</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-6">Obra: {obra.name}</p>

        <div className="flex justify-end mb-6">
          <button
            onClick={() => setIsCreating(true)}
            disabled={contratistas.length === 0}
            className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Asignar contratista
          </button>
        </div>

        {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
        {isLoading && <p className="font-label-sm text-on-surface-variant uppercase py-8">Cargando...</p>}

        {!isLoading && asignaciones.length === 0 && (
          <p className="font-label-sm text-on-surface-variant uppercase py-8 text-center border border-outline-variant">
            Sin contratistas asignados a esta obra todavia.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {!isLoading &&
            asignaciones.map((asignacion) => (
              <div key={asignacion.id} className="border border-outline-variant bg-surface p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="font-body-md font-semibold text-on-surface">{asignacion.contratistaName}</p>
                    {asignacion.contratistaOficio && (
                      <p className="font-label-sm text-on-surface-variant uppercase">
                        {asignacion.contratistaOficio}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-label-sm text-on-surface-variant uppercase">Total</p>
                      <p className="font-body-md text-primary font-semibold">
                        {currencyFormatter.format(asignacion.totalAmount)}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingAsignacion(asignacion)}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {asignacion.etapas.map((etapa) => {
                    const next = NEXT_ETAPA_STATUS[etapa.status];
                    const isPending = pendingEtapaId === etapa.id;
                    return (
                      <div
                        key={etapa.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-outline-variant pt-2"
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-body-md text-on-surface">{etapa.name}</span>
                          <span className="font-label-sm text-on-surface-variant">({etapa.percentage}%)</span>
                          <span
                            className={`font-label-sm uppercase px-2 py-1 border ${ETAPA_STATUS_CLASS[etapa.status]}`}
                          >
                            {ETAPA_STATUS_LABEL[etapa.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-body-md text-on-surface-variant">
                            {currencyFormatter.format(etapa.amount)}
                          </span>
                          {next && (
                            <button
                              disabled={isPending}
                              onClick={() => handleAdvanceEtapa(asignacion.id, etapa.id, next)}
                              className="font-label-sm uppercase text-primary hover:text-primary-fixed transition-colors disabled:opacity-50"
                            >
                              {isPending ? "..." : `Marcar ${ETAPA_STATUS_LABEL[next].toLowerCase()}`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-6 mt-3 pt-3 border-t border-outline-variant">
                  <span className="font-label-sm text-on-surface-variant uppercase">
                    Pagado: <span className="text-primary">{currencyFormatter.format(asignacion.paidAmount)}</span>
                  </span>
                  <span className="font-label-sm text-on-surface-variant uppercase">
                    Pendiente:{" "}
                    <span className="text-secondary">{currencyFormatter.format(asignacion.pendingAmount)}</span>
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {isCreating && (
        <AsignacionFormModal
          obraId={obra.id}
          obraName={obra.name}
          asignacion={null}
          contratistas={contratistas}
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingAsignacion && (
        <AsignacionFormModal
          obraId={obra.id}
          obraName={obra.name}
          asignacion={editingAsignacion}
          contratistas={contratistas}
          onClose={() => setEditingAsignacion(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
