import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createObra, listObras, setObraActive, setObraUsers, updateObra } from "../lib/obras";
import { listUsers } from "../lib/users";
import { listProyectos } from "../lib/proyectos";
import type { Obra, ObraInput } from "../types/obra";
import type { ManagedUser } from "../types/user";
import type { Proyecto } from "../types/proyecto";
import { ObraFormModal } from "../components/obras/ObraFormModal";
import { AssignUsersModal } from "../components/obras/AssignUsersModal";
import { ObraAbonosClienteModal } from "../components/obras/ObraAbonosClienteModal";
import { ObraContratistasModal } from "../components/contratistas/ObraContratistasModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const SIN_PROYECTO = "sin-proyecto";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function Obras() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const isSinProyecto = proyectoId === SIN_PROYECTO;

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraUsers, setObraUsersList] = useState<ManagedUser[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectoActual, setProyectoActual] = useState<Proyecto | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [assigningObra, setAssigningObra] = useState<Obra | null>(null);
  const [contratistasObra, setContratistasObra] = useState<Obra | null>(null);
  const [abonosClienteObra, setAbonosClienteObra] = useState<Obra | null>(null);
  const [deactivatingObra, setDeactivatingObra] = useState<Obra | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [obrasResult, usersResult, proyectosResult] = await Promise.all([
        listObras({
          search: search || undefined,
          proyectoId: isSinProyecto ? "none" : proyectoId,
        }),
        listUsers(),
        listProyectos(),
      ]);
      setObras(obrasResult);
      setObraUsersList(usersResult.filter((u) => u.role === "OBRA"));
      setProyectos(proyectosResult);
      setProyectoActual(
        !isSinProyecto ? proyectosResult.find((p) => p.id === proyectoId) ?? null : null,
      );
    } catch {
      setErrorMessage("No se pudieron cargar las obras.");
    } finally {
      setIsLoading(false);
    }
  }

  // Cambiar de obra/proyecto es una navegacion, no una busqueda: se carga de inmediato.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId]);

  // Solo la escritura en el buscador se debounce, y sin disparar un fetch duplicado al montar.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(refresh, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(input: ObraInput) {
    await createObra(input);
    await refresh();
  }

  async function handleUpdate(input: ObraInput) {
    if (!editingObra) return;
    await updateObra(editingObra.id, input);
    await refresh();
  }

  async function handleAssignUsers(userIds: string[]) {
    if (!assigningObra) return;
    await setObraUsers(assigningObra.id, userIds);
    await refresh();
  }

  async function handleToggleActive(obra: Obra) {
    if (obra.isActive) {
      setDeactivatingObra(obra);
      return;
    }
    await setObraActive(obra.id, true);
    await refresh();
  }

  async function confirmDeactivate() {
    if (!deactivatingObra) return;
    await setObraActive(deactivatingObra.id, false);
    setDeactivatingObra(null);
    await refresh();
  }

  const tituloProyecto = isSinProyecto ? "Obras sin proyecto" : proyectoActual?.name ?? "Obras";

  return (
    <div>
      <Link
        to="/proyectos"
        className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 mb-4"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Proyectos
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">{tituloProyecto}</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            {isSinProyecto
              ? "Obras que no pertenecen a ningun proyecto."
              : "Administra las obras de este proyecto y que usuarios tienen acceso a cada una."}
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
              placeholder="Buscar obras..."
              className="w-full bg-surface-container border-b border-outline-variant py-3 pl-10 pr-4 font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva obra
          </button>
        </div>
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
      {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isLoading &&
          obras.map((obra) => (
            <div
              key={obra.id}
              className={`border bg-surface-container p-6 transition-colors ${
                obra.isActive ? "border-outline-variant hover:border-primary" : "border-outline-variant opacity-60"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-body-lg font-semibold text-on-surface">{obra.name}</h3>
                <span
                  className={`font-label-sm uppercase px-2 py-1 border ${
                    obra.isActive ? "border-primary text-primary" : "border-error text-error"
                  }`}
                >
                  {obra.isActive ? "Activa" : "Inactiva"}
                </span>
              </div>
              {obra.proyectoName && (
                <p className="font-label-sm text-primary uppercase mb-1 flex items-start gap-1">
                  <span className="material-symbols-outlined text-[16px] mt-[1px] shrink-0">apartment</span>
                  <span>{obra.proyectoName}</span>
                </p>
              )}
              {obra.client && <p className="font-label-sm text-on-surface-variant uppercase mb-1">Cliente: {obra.client}</p>}
              {obra.precioVenta !== null && (
                <p className="font-label-sm text-on-surface-variant uppercase mb-1">
                  Precio de venta: {currencyFormatter.format(obra.precioVenta)}
                </p>
              )}
              {obra.address && <p className="font-body-md text-on-surface-variant mb-3">{obra.address}</p>}

              <div className="flex flex-wrap gap-2 mb-4">
                {(obra.users ?? []).length === 0 && (
                  <span className="font-label-sm text-on-surface-variant/60 uppercase">Sin usuarios asignados</span>
                )}
                {(obra.users ?? []).map((u) => (
                  <span
                    key={u.id}
                    className="font-label-sm uppercase px-2 py-1 border border-outline-variant text-on-surface-variant"
                  >
                    {u.name}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 border-t border-outline-variant pt-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button
                    onClick={() => setEditingObra(obra)}
                    className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={() => setAssigningObra(obra)}
                    className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    Usuarios
                  </button>
                  <button
                    onClick={() => setContratistasObra(obra)}
                    className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">engineering</span>
                    Contratistas
                  </button>
                  <Link
                    to={`/inventario?obraId=${obra.id}`}
                    className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    Inventario
                  </Link>
                  <button
                    onClick={() => setAbonosClienteObra(obra)}
                    className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                    Abonos cliente
                  </button>
                </div>
                <button
                  onClick={() => handleToggleActive(obra)}
                  className="font-label-sm uppercase text-on-surface-variant hover:text-error transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {obra.isActive ? "block" : "check_circle"}
                  </span>
                  {obra.isActive ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
      </div>

      {isCreating && (
        <ObraFormModal
          obra={null}
          proyectos={proyectos}
          defaultProyectoId={isSinProyecto ? null : proyectoId}
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingObra && (
        <ObraFormModal
          obra={editingObra}
          proyectos={proyectos}
          onClose={() => setEditingObra(null)}
          onSubmit={handleUpdate}
        />
      )}

      {assigningObra && (
        <AssignUsersModal
          obra={assigningObra}
          obraUsers={obraUsers}
          onClose={() => setAssigningObra(null)}
          onSubmit={handleAssignUsers}
        />
      )}

      {contratistasObra && (
        <ObraContratistasModal obra={contratistasObra} onClose={() => setContratistasObra(null)} />
      )}

      {abonosClienteObra && (
        <ObraAbonosClienteModal
          obra={abonosClienteObra}
          onClose={() => setAbonosClienteObra(null)}
          onChanged={refresh}
        />
      )}

      {deactivatingObra && (
        <ConfirmDialog
          title="Desactivar obra"
          message={`¿Seguro que deseas desactivar "${deactivatingObra.name}"? Sus usuarios ya no podran crear pedidos para ella.`}
          confirmLabel="Desactivar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivatingObra(null)}
        />
      )}
    </div>
  );
}
