import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createProyecto, deleteProyecto, listProyectos, setProyectoActive, updateProyecto } from "../lib/proyectos";
import { listObras } from "../lib/obras";
import type { Proyecto, ProyectoInput } from "../types/proyecto";
import { ProyectoFormModal } from "../components/proyectos/ProyectoFormModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function Proyectos() {
  const { user } = useAuth();
  const canDelete = user?.role === "ADMIN";

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [obrasSinProyectoCount, setObrasSinProyectoCount] = useState(0);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [deactivatingProyecto, setDeactivatingProyecto] = useState<Proyecto | null>(null);
  const [deletingProyecto, setDeletingProyecto] = useState<Proyecto | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [proyectosResult, obrasSinProyecto] = await Promise.all([
        listProyectos({ search: search || undefined }),
        listObras({ proyectoId: "none" }),
      ]);
      setProyectos(proyectosResult);
      setObrasSinProyectoCount(obrasSinProyecto.length);
    } catch {
      setErrorMessage("No se pudieron cargar los proyectos.");
    } finally {
      setIsLoading(false);
    }
  }

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      refresh();
      return;
    }
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

  async function confirmDelete() {
    if (!deletingProyecto) return;
    setDeletingProyecto(null);
    try {
      await deleteProyecto(deletingProyecto.id);
      await refresh();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo eliminar el proyecto.";
      setErrorMessage(message);
    }
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

              <Link
                to={`/proyectos/${proyecto.id}/obras`}
                className="flex items-center justify-between border border-outline-variant hover:border-primary transition-colors px-4 py-3 mb-4 group"
              >
                <span className="font-label-sm uppercase text-on-surface group-hover:text-primary transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">construction</span>
                  Ver obras ({(proyecto.obras ?? []).length})
                </span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                  chevron_right
                </span>
              </Link>

              <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 border-t border-outline-variant pt-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button
                    onClick={() => setEditingProyecto(proyecto)}
                    className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Editar
                  </button>
                  <Link
                    to={`/reportes?proyectoId=${proyecto.id}`}
                    className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    Inventario
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {!proyecto.isActive && canDelete && (
                    <button
                      onClick={() => setDeletingProyecto(proyecto)}
                      className="font-label-sm uppercase text-error/80 hover:text-error transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                      Eliminar
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleActive(proyecto)}
                    className="font-label-sm uppercase text-on-surface-variant hover:text-error transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {proyecto.isActive ? "block" : "check_circle"}
                    </span>
                    {proyecto.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            </div>
          ))}

        {!isLoading && (
          <Link
            to="/proyectos/sin-proyecto/obras"
            className="border border-dashed border-outline-variant hover:border-primary transition-colors p-6 flex flex-col justify-center group"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-body-lg font-semibold text-on-surface-variant group-hover:text-primary transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined">category</span>
                Obras sin proyecto
              </h3>
            </div>
            <p className="font-label-sm text-on-surface-variant/70 uppercase mb-4">
              Excepciones que no pertenecen a ningun proyecto.
            </p>
            <span className="font-label-sm uppercase text-on-surface-variant group-hover:text-primary transition-colors flex items-center gap-2">
              Ver obras ({obrasSinProyectoCount})
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </span>
          </Link>
        )}
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

      {deletingProyecto && (
        <ConfirmDialog
          title="Eliminar proyecto definitivamente"
          message={`Esto borra "${deletingProyecto.name}" y TODO lo que contiene de forma permanente: sus ${
            (deletingProyecto.obras ?? []).length
          } obra(s), el inventario de cada una, sus pedidos, las asignaciones a contratistas y los abonos de cliente. No se puede deshacer. Los registros ya generados en Historial se conservan. ¿Continuar?`}
          confirmLabel="Eliminar definitivamente"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingProyecto(null)}
        />
      )}
    </div>
  );
}
