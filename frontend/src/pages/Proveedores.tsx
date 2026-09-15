import { useEffect, useRef, useState } from "react";
import { createProveedor, listProveedores, setProveedorActive, updateProveedor } from "../lib/proveedores";
import { getProveedoresDeudaReport } from "../lib/reports";
import type { Proveedor, ProveedorInput } from "../types/proveedor";
import type { ProveedorDeuda } from "../types/report";
import { ProveedorFormModal } from "../components/proveedores/ProveedorFormModal";
import { ProveedorAbonosModal } from "../components/proveedores/ProveedorAbonosModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [deudas, setDeudas] = useState<ProveedorDeuda[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [abonosProveedor, setAbonosProveedor] = useState<Proveedor | null>(null);
  const [deactivatingProveedor, setDeactivatingProveedor] = useState<Proveedor | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [proveedoresResult, deudasResult] = await Promise.all([
        listProveedores({ search: search || undefined }),
        getProveedoresDeudaReport(),
      ]);
      setProveedores(proveedoresResult);
      setDeudas(deudasResult);
    } catch {
      setErrorMessage("No se pudieron cargar los proveedores.");
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

  async function handleCreate(input: ProveedorInput) {
    await createProveedor(input);
    await refresh();
  }

  async function handleUpdate(input: ProveedorInput) {
    if (!editingProveedor) return;
    await updateProveedor(editingProveedor.id, input);
    await refresh();
  }

  async function handleToggleActive(proveedor: Proveedor) {
    if (proveedor.isActive) {
      setDeactivatingProveedor(proveedor);
      return;
    }
    await setProveedorActive(proveedor.id, true);
    await refresh();
  }

  async function confirmDeactivate() {
    if (!deactivatingProveedor) return;
    await setProveedorActive(deactivatingProveedor.id, false);
    setDeactivatingProveedor(null);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Proveedores</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            Registra los proveedores disponibles para asignar a los pedidos.
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
              placeholder="Buscar proveedores..."
              className="w-full bg-surface-container border-b border-outline-variant py-3 pl-10 pr-4 font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo proveedor
          </button>
        </div>
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
      {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

      <div className="flex flex-col gap-4">
        <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest px-4">
          <div className="col-span-2">Nombre</div>
          <div className="col-span-2">Categoria</div>
          <div className="col-span-2">Contacto</div>
          <div className="col-span-2">Saldo</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-3 text-right">Acciones</div>
        </div>

        {!isLoading &&
          proveedores.map((proveedor) => {
            const deuda = deudas.find((d) => d.proveedorId === proveedor.id);
            const saldo = deuda?.saldo ?? 0;
            return (
            <div
              key={proveedor.id}
              className={`border bg-surface p-4 md:px-4 md:py-5 flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center transition-colors ${
                proveedor.isActive ? "border-outline-variant hover:border-primary" : "border-outline-variant opacity-60"
              }`}
            >
              <div className="md:col-span-2 font-body-md font-semibold text-on-surface">{proveedor.name}</div>
              <div className="md:col-span-2 font-label-sm uppercase text-on-surface-variant">
                {proveedor.category || "-"}
              </div>
              <div className="md:col-span-2 font-body-md text-on-surface-variant">
                {proveedor.contactName || "-"} {proveedor.phone && `- ${proveedor.phone}`}
              </div>
              <div className="md:col-span-2 font-body-md font-semibold">
                <span className={saldo > 0 ? "text-error" : "text-on-surface-variant"}>
                  {currencyFormatter.format(saldo)}
                </span>
              </div>
              <div className="md:col-span-1">
                <span
                  className={`font-label-sm uppercase px-2 py-1 border ${
                    proveedor.isActive ? "border-primary text-primary" : "border-error text-error"
                  }`}
                >
                  {proveedor.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="md:col-span-3 w-full flex justify-start md:justify-end items-center gap-3">
                <button
                  onClick={() => setAbonosProveedor(proveedor)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  title="Abonos"
                >
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </button>
                <button
                  onClick={() => setEditingProveedor(proveedor)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  title="Editar"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button
                  onClick={() => handleToggleActive(proveedor)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                  title={proveedor.isActive ? "Desactivar" : "Activar"}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {proveedor.isActive ? "block" : "check_circle"}
                  </span>
                </button>
              </div>
            </div>
            );
          })}
      </div>

      {abonosProveedor && (
        <ProveedorAbonosModal
          proveedor={abonosProveedor}
          saldoPendiente={deudas.find((d) => d.proveedorId === abonosProveedor.id)?.saldo}
          onClose={() => setAbonosProveedor(null)}
          onChanged={refresh}
        />
      )}

      {isCreating && (
        <ProveedorFormModal proveedor={null} onClose={() => setIsCreating(false)} onSubmit={handleCreate} />
      )}

      {editingProveedor && (
        <ProveedorFormModal
          proveedor={editingProveedor}
          onClose={() => setEditingProveedor(null)}
          onSubmit={handleUpdate}
        />
      )}

      {deactivatingProveedor && (
        <ConfirmDialog
          title="Desactivar proveedor"
          message={`¿Seguro que deseas desactivar a "${deactivatingProveedor.name}"? No aparecera disponible para nuevos pedidos.`}
          confirmLabel="Desactivar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivatingProveedor(null)}
        />
      )}
    </div>
  );
}
