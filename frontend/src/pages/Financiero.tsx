import { useEffect, useMemo, useState } from "react";
import { listProveedores } from "../lib/proveedores";
import { listObras } from "../lib/obras";
import { getClientesReport, getProveedoresDeudaReport } from "../lib/reports";
import { listHistorial } from "../lib/historial";
import { getAbonoCliente } from "../lib/abonosCliente";
import { getGastoAdicional } from "../lib/gastosAdicionales";
import { displayCurrency } from "../lib/currency";
import { exportClientesExcel, exportClientesPdf } from "../lib/exporters";
import type { Proveedor } from "../types/proveedor";
import type { Obra } from "../types/obra";
import type { AbonoCliente } from "../types/abonoCliente";
import type { GastoAdicional } from "../types/gastoAdicional";
import type { HistorialEvento } from "../types/historial";
import type { ClientesReport, ObraClientes, ProveedorDeuda } from "../types/report";
import { ProveedorAbonosModal } from "../components/proveedores/ProveedorAbonosModal";
import { ObraAbonosClienteModal } from "../components/obras/ObraAbonosClienteModal";
import { ReciboCajaModal } from "../components/obras/ReciboCajaModal";
import { GastoAdicionalModal } from "../components/financiero/GastoAdicionalModal";
import { ComprobanteGastoModal } from "../components/financiero/ComprobanteGastoModal";
import { MoneyStats } from "../components/ui/MoneyStats";

const exportButtonClass =
  "flex-1 border border-primary text-primary font-label-sm uppercase px-4 py-3 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";

const HISTORIAL_FINANCIERO_TIPOS = [
  "ABONO_REGISTRADO",
  "ABONO_CLIENTE_REGISTRADO",
  "GASTO_ADICIONAL_REGISTRADO",
] as const;

const HISTORIAL_META: Record<(typeof HISTORIAL_FINANCIERO_TIPOS)[number], { label: string; icon: string }> = {
  ABONO_REGISTRADO: { label: "Abono a proveedor", icon: "local_shipping" },
  ABONO_CLIENTE_REGISTRADO: { label: "Abono de cliente", icon: "receipt_long" },
  GASTO_ADICIONAL_REGISTRADO: { label: "Gasto adicional", icon: "request_quote" },
};

function fallbackObra(id: string, name: string, client: string | null, precioVenta: number | null): Obra {
  return {
    id,
    name,
    address: null,
    client,
    notes: null,
    precioVenta,
    isActive: true,
    createdAt: "",
    updatedAt: "",
    proyectoId: null,
    proyectoName: null,
  };
}

export function Financiero() {
  const [valuesVisible, setValuesVisible] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);

  const [deudas, setDeudas] = useState<ProveedorDeuda[]>([]);
  const [isLoadingDeudas, setIsLoadingDeudas] = useState(true);
  const [deudaSort, setDeudaSort] = useState<"desc" | "asc">("desc");
  const [abonosProveedor, setAbonosProveedor] = useState<Proveedor | null>(null);

  const [clientes, setClientes] = useState<ClientesReport | null>(null);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [isExportingClientes, setIsExportingClientes] = useState<"pdf" | "excel" | null>(null);
  const [clientesStatus, setClientesStatus] = useState<string | null>(null);
  const [pagoObra, setPagoObra] = useState<Obra | null>(null);

  const [historial, setHistorial] = useState<HistorialEvento[]>([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(true);
  const [receiptFromHistorial, setReceiptFromHistorial] = useState<{ abono: AbonoCliente; obra: Obra } | null>(null);
  const [gastoReceiptFromHistorial, setGastoReceiptFromHistorial] = useState<GastoAdicional | null>(null);
  const [historialError, setHistorialError] = useState<string | null>(null);

  const [isRegisteringGasto, setIsRegisteringGasto] = useState(false);
  const [gastoReceipt, setGastoReceipt] = useState<GastoAdicional | null>(null);

  useEffect(() => {
    listProveedores({ isActive: true }).then(setProveedores).catch(() => setProveedores([]));
    listObras({}).then(setObras).catch(() => setObras([]));
    refreshDeudas();
    refreshClientes();
    refreshHistorial();
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

  function refreshHistorial() {
    setIsLoadingHistorial(true);
    listHistorial({ tipos: [...HISTORIAL_FINANCIERO_TIPOS] })
      .then(setHistorial)
      .catch(() => setHistorial([]))
      .finally(() => setIsLoadingHistorial(false));
  }

  function refreshAfterPago() {
    refreshClientes();
    refreshHistorial();
  }

  function refreshAfterAbono() {
    refreshDeudas();
    refreshHistorial();
  }

  function handleGastoCreated(gasto: GastoAdicional) {
    setIsRegisteringGasto(false);
    setGastoReceipt(gasto);
    refreshHistorial();
  }

  const sortedDeudas = useMemo(
    () => [...deudas].sort((a, b) => (deudaSort === "desc" ? b.saldo - a.saldo : a.saldo - b.saldo)),
    [deudas, deudaSort],
  );

  function findObra(obraId: string, obraName: string, client: string | null, precioVenta: number | null): Obra {
    return obras.find((o) => o.id === obraId) ?? fallbackObra(obraId, obraName, client, precioVenta);
  }

  async function handleVerComprobante(evento: HistorialEvento) {
    if (!evento.abonoClienteId || !evento.obraId) return;
    setHistorialError(null);
    try {
      const abono = await getAbonoCliente(evento.abonoClienteId);
      const obra = findObra(evento.obraId, evento.obraName ?? "", null, null);
      setReceiptFromHistorial({ abono, obra });
    } catch {
      setHistorialError("No se pudo cargar el comprobante.");
    }
  }

  async function handleVerComprobanteGasto(evento: HistorialEvento) {
    if (!evento.gastoAdicionalId) return;
    setHistorialError(null);
    try {
      setGastoReceiptFromHistorial(await getGastoAdicional(evento.gastoAdicionalId));
    } catch {
      setHistorialError("No se pudo cargar el comprobante.");
    }
  }

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
            Pagos de clientes por obra, deuda pendiente con proveedores y su historial de movimientos.
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
          Lo que han abonado los compradores de cada obra frente a su precio de venta. Registra un pago directamente
          desde la obra en esta tabla.
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
                    <ObraClientesRow
                      key={obra.obraId}
                      obra={obra}
                      valuesVisible={valuesVisible}
                      onRegistrarPago={() => setPagoObra(findObra(obra.obraId, obra.obraName, obra.client, obra.precioVenta))}
                    />
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
                    <ObraClientesRow
                      key={obra.obraId}
                      obra={obra}
                      valuesVisible={valuesVisible}
                      onRegistrarPago={() => setPagoObra(findObra(obra.obraId, obra.obraName, obra.client, obra.precioVenta))}
                    />
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

      <section className="bg-surface-container lux-card-border p-6 md:p-8 mb-10">
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

      <section className="bg-surface-container lux-card-border p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 border-b border-outline-variant pb-4 sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">history</span>
            <h3 className="text-headline-md-mobile text-on-surface uppercase">Historial financiero</h3>
          </div>
          <button
            onClick={() => setIsRegisteringGasto(true)}
            className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2 self-start"
          >
            <span className="material-symbols-outlined text-[18px]">request_quote</span>
            Registrar gasto adicional
          </button>
        </div>
        <p className="font-body-md text-on-surface-variant mb-6">
          Registro propio de Financiero: abonos a proveedores, pagos de clientes y gastos adicionales, con fecha,
          hora y quien lo hizo. No se mezcla con el historial general del sistema.
        </p>

        {historialError && <p className="text-error font-label-sm uppercase mb-4">{historialError}</p>}
        {isLoadingHistorial && <p className="font-label-sm uppercase text-on-surface-variant mb-6">Cargando...</p>}

        {!isLoadingHistorial && historial.length === 0 && (
          <p className="text-on-surface-variant/60 font-label-sm uppercase px-2 py-6">Sin movimientos registrados</p>
        )}

        <div className="flex flex-col gap-3">
          {!isLoadingHistorial &&
            historial.map((evento) => {
              const meta = HISTORIAL_META[evento.tipo as (typeof HISTORIAL_FINANCIERO_TIPOS)[number]];
              const fecha = new Date(evento.createdAt);
              return (
                <div
                  key={evento.id}
                  className="border border-outline-variant bg-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex items-center gap-3 sm:w-48 shrink-0">
                    <span className="material-symbols-outlined text-primary">{meta?.icon ?? "payments"}</span>
                    <div>
                      <p className="font-label-sm uppercase text-primary">{meta?.label ?? evento.tipo}</p>
                      <p className="font-label-sm text-on-surface-variant/70">
                        {fecha.toLocaleDateString("es-CO")}{" "}
                        {fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface">{evento.descripcion}</p>
                    {evento.userName && (
                      <p className="font-label-sm text-on-surface-variant/70 uppercase mt-1">Por {evento.userName}</p>
                    )}
                  </div>

                  {evento.monto !== null && (
                    <div className="font-body-md font-semibold text-primary sm:text-right shrink-0">
                      {displayCurrency(evento.monto, valuesVisible)}
                    </div>
                  )}

                  {evento.tipo === "ABONO_CLIENTE_REGISTRADO" && evento.abonoClienteId && (
                    <button
                      onClick={() => handleVerComprobante(evento)}
                      className="font-label-sm uppercase text-primary hover:text-primary-fixed transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      Ver comprobante
                    </button>
                  )}

                  {evento.tipo === "GASTO_ADICIONAL_REGISTRADO" && evento.gastoAdicionalId && (
                    <button
                      onClick={() => handleVerComprobanteGasto(evento)}
                      className="font-label-sm uppercase text-primary hover:text-primary-fixed transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      Ver comprobante
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {abonosProveedor && (
        <ProveedorAbonosModal
          proveedor={abonosProveedor}
          saldoPendiente={deudas.find((d) => d.proveedorId === abonosProveedor.id)?.saldo}
          valuesVisible={valuesVisible}
          onClose={() => setAbonosProveedor(null)}
          onChanged={refreshAfterAbono}
        />
      )}

      {pagoObra && (
        <ObraAbonosClienteModal
          obra={pagoObra}
          valuesVisible={valuesVisible}
          onClose={() => setPagoObra(null)}
          onChanged={refreshAfterPago}
        />
      )}

      {receiptFromHistorial && (
        <ReciboCajaModal
          abono={receiptFromHistorial.abono}
          obra={receiptFromHistorial.obra}
          onClose={() => setReceiptFromHistorial(null)}
        />
      )}

      {isRegisteringGasto && (
        <GastoAdicionalModal
          obras={obras}
          onClose={() => setIsRegisteringGasto(false)}
          onCreated={handleGastoCreated}
        />
      )}

      {gastoReceipt && <ComprobanteGastoModal gasto={gastoReceipt} onClose={() => setGastoReceipt(null)} />}

      {gastoReceiptFromHistorial && (
        <ComprobanteGastoModal
          gasto={gastoReceiptFromHistorial}
          onClose={() => setGastoReceiptFromHistorial(null)}
        />
      )}
    </div>
  );
}

interface ObraClientesRowProps {
  obra: ObraClientes;
  valuesVisible: boolean;
  onRegistrarPago: () => void;
}

function ObraClientesRow({ obra, valuesVisible, onRegistrarPago }: ObraClientesRowProps) {
  return (
    <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-outline-variant last:border-b-0">
      <div className="font-body-md text-on-surface">
        <span>{obra.obraName}</span>
        {obra.client && <span className="font-label-sm text-on-surface-variant uppercase ml-2">({obra.client})</span>}
        {!obra.isActive && <span className="font-label-sm text-error uppercase ml-2">(inactiva)</span>}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
        <button
          onClick={onRegistrarPago}
          className="font-label-sm uppercase text-primary hover:text-primary-fixed transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">add_card</span>
          Registrar pago
        </button>
      </div>
    </div>
  );
}
