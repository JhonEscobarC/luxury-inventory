import { useEffect, useMemo, useState } from "react";
import { listProveedores } from "../lib/proveedores";
import { getClientesReport, getProveedoresDeudaReport } from "../lib/reports";
import { displayCurrency } from "../lib/currency";
import { exportClientesExcel, exportClientesPdf } from "../lib/exporters";
import type { Proveedor } from "../types/proveedor";
import type { ClientesReport, ObraClientes, ProveedorDeuda } from "../types/report";
import { ProveedorAbonosModal } from "../components/proveedores/ProveedorAbonosModal";
import { MoneyStats } from "../components/ui/MoneyStats";

const exportButtonClass =
  "flex-1 border border-primary text-primary font-label-sm uppercase px-4 py-3 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";

export function Financiero() {
  const [valuesVisible, setValuesVisible] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [deudas, setDeudas] = useState<ProveedorDeuda[]>([]);
  const [isLoadingDeudas, setIsLoadingDeudas] = useState(true);
  const [deudaSort, setDeudaSort] = useState<"desc" | "asc">("desc");
  const [abonosProveedor, setAbonosProveedor] = useState<Proveedor | null>(null);

  const [clientes, setClientes] = useState<ClientesReport | null>(null);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [isExportingClientes, setIsExportingClientes] = useState<"pdf" | "excel" | null>(null);
  const [clientesStatus, setClientesStatus] = useState<string | null>(null);

  useEffect(() => {
    listProveedores({ isActive: true }).then(setProveedores).catch(() => setProveedores([]));
    refreshDeudas();
    refreshClientes();
  }, []);

  function refreshClientes() {
    setIsLoadingClientes(true);
    getClientesReport()
      .then(setClientes)
      .catch(() => setClientes(null))
      .finally(() => setIsLoadingClientes(false));
  }

  function refreshDeudas() {
    setIsLoadingDeudas(true);
    getProveedoresDeudaReport()
      .then(setDeudas)
      .catch(() => setDeudas([]))
      .finally(() => setIsLoadingDeudas(false));
  }

  const sortedDeudas = useMemo(
    () => [...deudas].sort((a, b) => (deudaSort === "desc" ? b.saldo - a.saldo : a.saldo - b.saldo)),
    [deudas, deudaSort],
  );

  async function handleClientesExport(format: "pdf" | "excel") {
    if (!clientes) return;
    const allObras = [...clientes.proyectos.flatMap((p) => p.obras), ...clientes.obrasSinProyecto];
    if (allObras.length === 0) {
      setClientesStatus("No hay obras para exportar.");
      return;
    }
    setIsExportingClientes(format);
    setClientesStatus(null);
    try {
      if (format === "pdf") {
        await exportClientesPdf(allObras);
      } else {
        await exportClientesExcel(allObras);
      }
      setClientesStatus(`Exportadas ${allObras.length} obra(s).`);
    } finally {
      setIsExportingClientes(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Financiero</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            Pagos de clientes por obra y deuda pendiente con proveedores.
          </p>
        </div>
        <button
          onClick={() => setValuesVisible((prev) => !prev)}
          className="border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2 self-start"
        >
          <span className="material-symbols-outlined text-[18px]">{valuesVisible ? "visibility_off" : "visibility"}</span>
          {valuesVisible ? "Ocultar valores" : "Mostrar valores"}
        </button>
      </div>

      <section className="bg-surface-container lux-card-border p-6 md:p-8 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 border-b border-outline-variant pb-4 sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">payments</span>
            <h3 className="text-headline-md-mobile text-on-surface uppercase">Pagos de clientes</h3>
          </div>
        </div>
        <p className="font-body-md text-on-surface-variant mb-6">
          Lo que han abonado los compradores de cada obra frente a su precio de venta. Para registrar un abono, entra
          a la obra desde Proyectos.
        </p>

        {isLoadingClientes && <p className="font-label-sm uppercase text-on-surface-variant mb-6">Cargando...</p>}

        {!isLoadingClientes && clientes && (
          <div className="flex flex-col gap-6">
            {clientes.proyectos.map((proyecto) => (
              <div key={proyecto.proyectoId} className="border border-outline-variant">
                <div className="bg-surface px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-outline-variant">
                  <span className="font-body-md font-semibold text-primary uppercase">{proyecto.proyectoName}</span>
                  <MoneyStats
                    items={[
                      { label: "Precio venta", value: displayCurrency(proyecto.precioVenta, valuesVisible) },
                      { label: "Abonado", value: displayCurrency(proyecto.totalAbonado, valuesVisible) },
                      {
                        label: "Saldo",
                        value: displayCurrency(proyecto.precioVenta - proyecto.totalAbonado, valuesVisible),
                        emphasize: true,
                      },
                    ]}
                  />
                </div>
                <div className="flex flex-col">
                  {proyecto.obras.map((obra) => (
                    <ObraClientesRow key={obra.obraId} obra={obra} valuesVisible={valuesVisible} />
                  ))}
                </div>
              </div>
            ))}

            {clientes.obrasSinProyecto.length > 0 && (
              <div className="border border-outline-variant">
                <div className="bg-surface px-4 py-3 border-b border-outline-variant">
                  <span className="font-body-md font-semibold text-on-surface-variant uppercase">Obras sin proyecto</span>
                </div>
                <div className="flex flex-col">
                  {clientes.obrasSinProyecto.map((obra) => (
                    <ObraClientesRow key={obra.obraId} obra={obra} valuesVisible={valuesVisible} />
                  ))}
                </div>
              </div>
            )}

            <div className="border border-primary p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <span className="font-label-sm uppercase text-on-surface-variant">Total general</span>
              <MoneyStats
                items={[
                  { label: "Precio venta", value: displayCurrency(clientes.totalPrecioVenta, valuesVisible) },
                  { label: "Abonado", value: displayCurrency(clientes.totalAbonado, valuesVisible) },
                  {
                    label: "Saldo",
                    value: displayCurrency(clientes.totalPrecioVenta - clientes.totalAbonado, valuesVisible),
                    emphasize: true,
                  },
                ]}
              />
            </div>
          </div>
        )}

        {clientesStatus && (
          <p className="font-label-sm uppercase text-on-surface-variant mt-6">{clientesStatus}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            onClick={() => handleClientesExport("pdf")}
            disabled={isExportingClientes !== null}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {isExportingClientes === "pdf" ? "Generando..." : "Exportar PDF"}
          </button>
          <button
            onClick={() => handleClientesExport("excel")}
            disabled={isExportingClientes !== null}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            {isExportingClientes === "excel" ? "Generando..." : "Exportar Excel"}
          </button>
        </div>
      </section>

      <section className="bg-surface-container lux-card-border p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 border-b border-outline-variant pb-4 sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">local_shipping</span>
            <h3 className="text-headline-md-mobile text-on-surface uppercase">Deuda a proveedores</h3>
          </div>
          <button
            onClick={() => setDeudaSort((prev) => (prev === "desc" ? "asc" : "desc"))}
            className="font-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">
              {deudaSort === "desc" ? "arrow_downward" : "arrow_upward"}
            </span>
            {deudaSort === "desc" ? "Mayor a menor" : "Menor a mayor"}
          </button>
        </div>

        {isLoadingDeudas && <p className="font-label-sm uppercase text-on-surface-variant mb-6">Cargando...</p>}

        {!isLoadingDeudas && (
          <div className="flex flex-col gap-3">
            <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest px-2">
              <div className="col-span-4">Proveedor</div>
              <div className="col-span-2">Despachado</div>
              <div className="col-span-2">Abonado</div>
              <div className="col-span-2">Saldo</div>
              <div className="col-span-2 text-right">Acciones</div>
            </div>
            {sortedDeudas.length === 0 && (
              <p className="text-on-surface-variant/60 font-label-sm uppercase px-2 py-6">Sin proveedores</p>
            )}
            {sortedDeudas.map((deuda) => (
              <div
                key={deuda.proveedorId}
                className="border border-outline-variant p-3 md:px-2 md:py-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
              >
                <div className="md:col-span-4 font-body-md font-semibold text-on-surface">{deuda.proveedorName}</div>
                <div className="md:col-span-2 font-body-md text-on-surface-variant">
                  <span className="md:hidden font-label-sm uppercase text-on-surface-variant/70 mr-1">Despachado:</span>
                  {displayCurrency(deuda.totalDespachado, valuesVisible)}
                </div>
                <div className="md:col-span-2 font-body-md text-on-surface-variant">
                  <span className="md:hidden font-label-sm uppercase text-on-surface-variant/70 mr-1">Abonado:</span>
                  {displayCurrency(deuda.totalAbonado, valuesVisible)}
                </div>
                <div className="md:col-span-2 font-body-md font-semibold">
                  <span className="md:hidden font-label-sm uppercase text-on-surface-variant/70 mr-1 font-normal">
                    Saldo:
                  </span>
                  <span className={deuda.saldo > 0 ? "text-error" : "text-on-surface-variant"}>
                    {displayCurrency(deuda.saldo, valuesVisible)}
                  </span>
                </div>
                <div className="md:col-span-2 flex justify-start md:justify-end">
                  <button
                    onClick={() =>
                      setAbonosProveedor(
                        proveedores.find((p) => p.id === deuda.proveedorId) ?? {
                          id: deuda.proveedorId,
                          name: deuda.proveedorName,
                          contactName: null,
                          phone: null,
                          email: null,
                          address: null,
                          category: null,
                          notes: null,
                          isActive: deuda.isActive,
                          createdAt: "",
                          updatedAt: "",
                        },
                      )
                    }
                    className="font-label-sm uppercase text-primary hover:text-primary-fixed transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                    Abonar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {abonosProveedor && (
        <ProveedorAbonosModal
          proveedor={abonosProveedor}
          saldoPendiente={deudas.find((d) => d.proveedorId === abonosProveedor.id)?.saldo}
          onClose={() => setAbonosProveedor(null)}
          onChanged={refreshDeudas}
        />
      )}
    </div>
  );
}

function ObraClientesRow({ obra, valuesVisible }: { obra: ObraClientes; valuesVisible: boolean }) {
  return (
    <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-outline-variant last:border-b-0">
      <div className="font-body-md text-on-surface">
        <span>{obra.obraName}</span>
        {obra.client && <span className="font-label-sm text-on-surface-variant uppercase ml-2">({obra.client})</span>}
        {!obra.isActive && <span className="font-label-sm text-error uppercase ml-2">(inactiva)</span>}
      </div>
      <MoneyStats
        items={[
          {
            label: "Precio venta",
            value: obra.precioVenta !== null ? displayCurrency(obra.precioVenta, valuesVisible) : "Sin definir",
          },
          { label: "Abonado", value: displayCurrency(obra.totalAbonado, valuesVisible) },
          {
            label: "Saldo",
            value: obra.saldo !== null ? displayCurrency(obra.saldo, valuesVisible) : "-",
            emphasize: obra.saldo !== null && obra.saldo > 0,
          },
        ]}
      />
    </div>
  );
}
