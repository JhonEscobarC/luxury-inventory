import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createContratista, listContratistas, setContratistaActive, updateContratista } from "../lib/contratistas";
import type { Contratista, ContratistaInput } from "../types/contratista";
import { ContratistaFormModal } from "../components/contratistas/ContratistaFormModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function Contratistas() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [contratistas, setContratistas] = useState<Contratista[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingContratista, setEditingContratista] = useState<Contratista | null>(null);
  const [deactivatingContratista, setDeactivatingContratista] = useState<Contratista | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setContratistas(await listContratistas({ search: search || undefined }));
    } catch {
      setErrorMessage("No se pudieron cargar los contratistas.");
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

  async function handleCreate(input: ContratistaInput) {
    await createContratista(input);
    await refresh();
  }

  async function handleUpdate(input: ContratistaInput) {
    if (!editingContratista) return;
    await updateContratista(editingContratista.id, input);
    await refresh();
  }

  async function handleToggleActive(contratista: Contratista) {
    if (contratista.isActive) {
      setDeactivatingContratista(contratista);
      return;
    }
    await setContratistaActive(contratista.id, true);
    await refresh();
  }

  async function confirmDeactivate() {
    if (!deactivatingContratista) return;
    await setContratistaActive(deactivatingContratista.id, false);
    setDeactivatingContratista(null);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Contratistas</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            Registra los contratistas disponibles para asignarlos a las obras junto a sus etapas de pago.
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
              placeholder="Buscar contratistas..."
              className="w-full bg-surface-container border-b border-outline-variant py-3 pl-10 pr-4 font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo contratista
          </button>
        </div>
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
      {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

      <div className="flex flex-col gap-4">
        <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest px-4">
          <div className="col-span-3">Nombre</div>
          <div className="col-span-2">Oficio</div>
          <div className="col-span-3">Contacto</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {!isLoading &&
          contratistas.map((contratista) => (
            <div
              key={contratista.id}
              className={`border bg-surface p-4 md:px-4 md:py-5 flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center transition-colors ${
                contratista.isActive
                  ? "border-outline-variant hover:border-primary"
                  : "border-outline-variant opacity-60"
              }`}
            >
              <div className="md:col-span-3 font-body-md font-semibold text-on-surface">{contratista.name}</div>
              <div className="md:col-span-2 font-label-sm uppercase text-on-surface-variant">
                {contratista.oficio || "-"}
              </div>
              <div className="md:col-span-3 font-body-md text-on-surface-variant">
                {contratista.phone || "-"} {contratista.email && `- ${contratista.email}`}
              </div>
              <div className="md:col-span-2">
                <span
                  className={`font-label-sm uppercase px-2 py-1 border ${
                    contratista.isActive ? "border-primary text-primary" : "border-error text-error"
                  }`}
                >
                  {contratista.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="md:col-span-2 w-full flex justify-start md:justify-end items-center gap-3">
                <button
                  onClick={() => setEditingContratista(contratista)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  title="Editar"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleToggleActive(contratista)}
                    className="text-on-surface-variant hover:text-error transition-colors"
                    title={contratista.isActive ? "Desactivar" : "Activar"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {contratista.isActive ? "block" : "check_circle"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {isCreating && (
        <ContratistaFormModal contratista={null} onClose={() => setIsCreating(false)} onSubmit={handleCreate} />
      )}

      {editingContratista && (
        <ContratistaFormModal
          contratista={editingContratista}
          onClose={() => setEditingContratista(null)}
          onSubmit={handleUpdate}
        />
      )}

      {deactivatingContratista && (
        <ConfirmDialog
          title="Desactivar contratista"
          message={`¿Seguro que deseas desactivar a "${deactivatingContratista.name}"? No aparecera disponible para nuevas asignaciones.`}
          confirmLabel="Desactivar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivatingContratista(null)}
        />
      )}
    </div>
  );
}
