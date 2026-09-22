import { type FormEvent, useEffect, useState } from "react";
import { createObraEtapa, deleteObraEtapa, listObraEtapas, reorderObraEtapas } from "../../lib/obraEtapas";
import type { Obra } from "../../types/obra";
import type { ObraEtapa } from "../../types/obraEtapa";

interface ObraEtapasModalProps {
  obra: Obra;
  onClose: () => void;
}

export function ObraEtapasModal({ obra, onClose }: ObraEtapasModalProps) {
  const [etapas, setEtapas] = useState<ObraEtapa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setEtapas(await listObraEtapas(obra.id));
    } catch {
      setErrorMessage("No se pudieron cargar las etapas de esta obra.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra.id]);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= etapas.length) return;
    const reordered = [...etapas];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setEtapas(reordered);
    try {
      await reorderObraEtapas(obra.id, reordered.map((e) => e.id));
    } catch {
      setErrorMessage("No se pudo reordenar las etapas.");
      await refresh();
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createObraEtapa(obra.id, newName.trim());
      setNewName("");
      await refresh();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo agregar la etapa.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(etapa: ObraEtapa) {
    setPendingId(etapa.id);
    setErrorMessage(null);
    try {
      await deleteObraEtapa(etapa.id);
      await refresh();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo eliminar la etapa.";
      setErrorMessage(message);
    } finally {
      setPendingId(null);
    }
  }

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">Etapas de la obra</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-6">Obra: {obra.name}</p>

        {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
        {isLoading && <p className="font-label-sm text-on-surface-variant uppercase py-8">Cargando...</p>}

        {!isLoading && (
          <div className="flex flex-col gap-2 mb-6">
            {etapas.map((etapa, index) => (
              <div
                key={etapa.id}
                className="flex items-center justify-between gap-3 border border-outline-variant bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-label-sm text-on-surface-variant/60 w-6 text-right">{index + 1}</span>
                  <span className="font-body-md text-on-surface">{etapa.name}</span>
                  {etapa.isCustom && (
                    <span className="font-label-sm uppercase text-secondary border border-secondary px-2 py-0.5">
                      Personalizada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
                    title="Subir"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    disabled={index === etapas.length - 1}
                    onClick={() => move(index, 1)}
                    className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
                    title="Bajar"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                  </button>
                  {etapa.isCustom && (
                    <button
                      type="button"
                      disabled={pendingId === etapa.id}
                      onClick={() => handleDelete(etapa)}
                      className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-3 border-t border-outline-variant pt-6">
          <input
            className={inputClass}
            placeholder="Nombre de la nueva etapa"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newName.trim()}
            className="bg-primary-container text-on-primary font-label-sm uppercase px-6 py-3 hover:bg-primary-fixed transition-colors disabled:opacity-60 shrink-0 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Agregar
          </button>
        </form>
        <p className="font-label-sm text-on-surface-variant/60 uppercase mt-3">
          La etapa nueva se agrega al final; usa las flechas para ubicarla donde quieras.
        </p>
      </div>
    </div>
  );
}
