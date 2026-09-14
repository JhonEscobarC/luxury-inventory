import { useEffect, useState } from "react";
import { createProyecto, listProyectos, setProyectoActive, updateProyecto } from "../lib/proyectos";
import type { Proyecto, ProyectoInput } from "../types/proyecto";
import { ProyectoFormModal } from "../components/proyectos/ProyectoFormModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function Proyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [deactivatingProyecto, setDeactivatingProyecto] = useState<Proyecto | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setProyectos(await listProyectos({ search: search || undefined }));
    } catch {
      setErrorMessage("No se pudieron cargar los proyectos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(refresh, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(input: ProyectoInput) {
    await createProyecto(input);
    await refresh();
  }

  async function handleUpdate(input: ProyectoInput) {
    if (!editingProyecto) return;
    await updateProyecto(editingProyecto.id, input);
    await refresh();
  }

  async function handleToggleActive(proyecto: Proyecto) {
    if (proyecto.isActive) {
      setDeactivatingProyecto(proyecto);
      return;
    }
    await setProyectoActive(proyecto.id, true);
    await refresh();
  }

  async function confirmDeactivate() {
    if (!deactivatingProyecto) return;
    await setProyectoActive(deactivatingProyecto.id, false);
    setDeactivatingProyecto(null);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Proyectos</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            Agrupa varias obras bajo un mismo proyecto (ej. una urbanizacion con multiples casas).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar proyectos..."
              className="w-full bg-surface-container border-b border-outline-variant py-3 pl-10 pr-4 font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo proyecto
          </button>
        </div>
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
      {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isLoading &&
          proyectos.map((proyecto) => (
            <div
              key={proyecto.id}
              className={`border bg-surface-container p-6 transition-colors ${
                proyecto.isActive ? "border-outline-variant hover:border-primary" : "border-outline-variant opacity-60"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-body-lg font-semibold text-on-surface">{proyecto.name}</h3>
                <span
                  className={`font-label-sm uppercase px-2 py-1 border ${
                    proyecto.isActive ? "border-primary text-primary" : "border-error text-error"
                  }`}
                >
                  {proyecto.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              {proyecto.client && (
                <p className="font-label-sm text-on-surface-variant uppercase mb-3">Cliente: {proyecto.client}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {(proyecto.obras ?? []).length === 0 && (
                  <span className="font-label-sm text-on-surface-variant/60 uppercase">Sin obras asignadas</span>
                )}
                {(proyecto.obras ?? []).map((o) => (
                  <span
                    key={o.id}
                    className={`font-label-sm uppercase px-2 py-1 border ${
                      o.isActive ? "border-outline-variant text-on-surface-variant" : "border-outline-variant opacity-50"
                    }`}
                  >
                    {o.name}
                  </span>
                ))}
              </div>

              <div className="flex gap-4 border-t border-outline-variant pt-4">
                <button
                  onClick={() => setEditingProyecto(proyecto)}
                  className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(proyecto)}
                  className="font-label-sm uppercase text-on-surface-variant hover:text-error transition-colors flex items-center gap-1 ml-auto"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {proyecto.isActive ? "block" : "check_circle"}
                  </span>
                  {proyecto.isActive ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
      </div>

      {isCreating && <ProyectoFormModal proyecto={null} onClose={() => setIsCreating(false)} onSubmit={handleCreate} />}

      {editingProyecto && (
        <ProyectoFormModal
          proyecto={editingProyecto}
          onClose={() => setEditingProyecto(null)}
          onSubmit={handleUpdate}
        />
      )}

      {deactivatingProyecto && (
        <ConfirmDialog
          title="Desactivar proyecto"
          message={`¿Seguro que deseas desactivar "${deactivatingProyecto.name}"?`}
          confirmLabel="Desactivar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivatingProyecto(null)}
        />
      )}
    </div>
  );
}
