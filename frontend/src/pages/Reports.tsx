import { useEffect, useMemo, useState } from "react";
import { listProyectos } from "../lib/proyectos";
import { listObras } from "../lib/obras";
import { getTablaReport } from "../lib/reports";
import { displayCurrency } from "../lib/currency";
import { exportTablaExcel, exportTablaPdf } from "../lib/exporters";
import type { TablaColumn } from "../lib/exporters";
import type { Proyecto } from "../types/proyecto";
import type { Obra } from "../types/obra";
import type {
  TablaClienteRow,
  TablaContratistaRow,
  TablaInventarioRow,
  TablaProveedorRow,
  TablaTab,
} from "../types/report";
import { usePagination } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";

type LeftMode = "cuentas" | "proyecto" | "periodo";
type Row = TablaInventarioRow | TablaProveedorRow | TablaContratistaRow | TablaClienteRow;

const TABS: { value: TablaTab; label: string; icon: string }[] = [
  { value: "inventario", label: "Inventario", icon: "inventory_2" },
  { value: "proveedores", label: "Proveedores", icon: "local_shipping" },
  { value: "contratistas", label: "Contratistas", icon: "engineering" },
  { value: "clientes", label: "Clientes", icon: "payments" },
];

const LEFT_ITEMS: { value: LeftMode; label: string; icon: string }[] = [
  { value: "cuentas", label: "Cuentas", icon: "account_balance_wallet" },
  { value: "proyecto", label: "Proyecto", icon: "apartment" },
  { value: "periodo", label: "Periodo", icon: "date_range" },
];

const TAB_DESCRIPTION: Record<TablaTab, string> = {
  inventario: "Todo lo que hay registrado en inventario, con su valor.",
  proveedores: "Cuanto se les ha gastado, cuanto se les ha pagado y cuanto se les debe.",
  contratistas: "Cuanto se les ha asignado, cuanto se les ha pagado y cuanto se les debe.",
  clientes: "Cuanto han abonado los compradores y el saldo pendiente de cada obra.",
};

function money(value: number | null, visible: boolean) {
  return value === null ? "-" : displayCurrency(value, visible);
}

interface ColumnDef {
  header: string;
  align?: "right";
  render: (row: Row, visible: boolean) => string;
  exportKey: string;
  exportValue: (row: Row) => string | number;
}

function columnsFor(tab: TablaTab): ColumnDef[] {
  switch (tab) {
    case "inventario":
      return [
        { header: "Nombre", render: (r) => (r as TablaInventarioRow).name, exportKey: "name", exportValue: (r) => (r as TablaInventarioRow).name },
        { header: "Categoria", render: (r) => (r as TablaInventarioRow).categoriaName ?? "-", exportKey: "categoriaName", exportValue: (r) => (r as TablaInventarioRow).categoriaName ?? "-" },
        { header: "Obra", render: (r) => (r as TablaInventarioRow).obraName, exportKey: "obraName", exportValue: (r) => (r as TablaInventarioRow).obraName },
        { header: "Proyecto", render: (r) => (r as TablaInventarioRow).proyectoName ?? "-", exportKey: "proyectoName", exportValue: (r) => (r as TablaInventarioRow).proyectoName ?? "-" },
        { header: "Cantidad", align: "right", render: (r) => `${(r as TablaInventarioRow).quantity} ${(r as TablaInventarioRow).unit}`, exportKey: "quantity", exportValue: (r) => (r as TablaInventarioRow).quantity },
        { header: "Precio", align: "right", render: (r, v) => money((r as TablaInventarioRow).price, v), exportKey: "price", exportValue: (r) => (r as TablaInventarioRow).price },
        { header: "Total", align: "right", render: (r, v) => money((r as TablaInventarioRow).total, v), exportKey: "total", exportValue: (r) => (r as TablaInventarioRow).total },
      ];
    case "proveedores":
      return [
        { header: "Proveedor", render: (r) => (r as TablaProveedorRow).proveedorName, exportKey: "proveedorName", exportValue: (r) => (r as TablaProveedorRow).proveedorName },
        { header: "Gastado", align: "right", render: (r, v) => money((r as TablaProveedorRow).totalGastado, v), exportKey: "totalGastado", exportValue: (r) => (r as TablaProveedorRow).totalGastado },
        { header: "Pagado", align: "right", render: (r, v) => money((r as TablaProveedorRow).totalPagado, v), exportKey: "totalPagado", exportValue: (r) => (r as TablaProveedorRow).totalPagado },
        { header: "Debe", align: "right", render: (r, v) => money((r as TablaProveedorRow).saldoActual, v), exportKey: "saldoActual", exportValue: (r) => (r as TablaProveedorRow).saldoActual },
      ];
    case "contratistas":
      return [
        { header: "Contratista", render: (r) => (r as TablaContratistaRow).contratistaName, exportKey: "contratistaName", exportValue: (r) => (r as TablaContratistaRow).contratistaName },
        { header: "Asignado", align: "right", render: (r, v) => money((r as TablaContratistaRow).totalAsignado, v), exportKey: "totalAsignado", exportValue: (r) => (r as TablaContratistaRow).totalAsignado },
        { header: "Pagado", align: "right", render: (r, v) => money((r as TablaContratistaRow).totalPagado, v), exportKey: "totalPagado", exportValue: (r) => (r as TablaContratistaRow).totalPagado },
        { header: "Debe", align: "right", render: (r, v) => money((r as TablaContratistaRow).saldoActual, v), exportKey: "saldoActual", exportValue: (r) => (r as TablaContratistaRow).saldoActual },
      ];
    case "clientes":
      return [
        { header: "Obra", render: (r) => (r as TablaClienteRow).obraName, exportKey: "obraName", exportValue: (r) => (r as TablaClienteRow).obraName },
        { header: "Proyecto", render: (r) => (r as TablaClienteRow).proyectoName ?? "-", exportKey: "proyectoName", exportValue: (r) => (r as TablaClienteRow).proyectoName ?? "-" },
        { header: "Comprador", render: (r) => (r as TablaClienteRow).client ?? "-", exportKey: "client", exportValue: (r) => (r as TablaClienteRow).client ?? "-" },
        { header: "Precio venta", align: "right", render: (r, v) => money((r as TablaClienteRow).precioVenta, v), exportKey: "precioVenta", exportValue: (r) => (r as TablaClienteRow).precioVenta ?? "" },
        { header: "Abonado", align: "right", render: (r, v) => money((r as TablaClienteRow).totalAbonado, v), exportKey: "totalAbonado", exportValue: (r) => (r as TablaClienteRow).totalAbonado },
        { header: "Saldo", align: "right", render: (r, v) => money((r as TablaClienteRow).saldoActual, v), exportKey: "saldoActual", exportValue: (r) => (r as TablaClienteRow).saldoActual ?? "" },
      ];
  }
}

const selectClass =
  "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3";
const exportButtonClass =
  "border border-primary text-primary font-label-sm uppercase px-4 py-3 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";

export function Reports() {
  const [tab, setTab] = useState<TablaTab>("inventario");
  const [leftMode, setLeftMode] = useState<LeftMode>("cuentas");
  const [valuesVisible, setValuesVisible] = useState(false);

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [proyectoId, setProyectoId] = useState("");
  const [obraId, setObraId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    listProyectos({ isActive: true }).then(setProyectos).catch(() => setProyectos([]));
    listObras({}).then(setObras).catch(() => setObras([]));
  }, []);

  const obraOptions = useMemo(() => {
    if (!proyectoId) return obras;
    if (proyectoId === "none") return obras.filter((o) => !o.proyectoId);
    return obras.filter((o) => o.proyectoId === proyectoId);
  }, [obras, proyectoId]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const filters =
      leftMode === "proyecto"
        ? { proyectoId: proyectoId || undefined, obraId: obraId || undefined }
        : leftMode === "periodo"
          ? { from: from || undefined, to: to || undefined }
          : {};
    getTablaReport<Row>(tab, filters)
      .then(setRows)
      .catch(() => setError("No se pudo cargar el reporte."))
      .finally(() => setIsLoading(false));
  }, [tab, leftMode, proyectoId, obraId, from, to]);

  const columns = useMemo(() => columnsFor(tab), [tab]);
  const { pageItems: pageRows, ...pagination } = usePagination(rows);

  async function handleExport(format: "pdf" | "excel") {
    if (rows.length === 0) return;
    setIsExporting(format);
    try {
      const title = `Reporte de ${TABS.find((t) => t.value === tab)!.label}`;
      if (format === "pdf") {
        const headers = columns.map((c) => c.header);
        const body = rows.map((row) => columns.map((c) => c.exportValue(row)));
        await exportTablaPdf(title, headers, body, { filenamePrefix: tab });
      } else {
        const excelColumns: TablaColumn[] = columns.map((c) => ({
          header: c.header,
          key: c.exportKey,
          width: c.exportKey.length > 12 ? 22 : 16,
        }));
        const excelRows = rows.map((row) =>
          Object.fromEntries(columns.map((c) => [c.exportKey, c.exportValue(row)])),
        );
        await exportTablaExcel(title, excelColumns, excelRows, { filenamePrefix: tab });
      }
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Reportes</h2>
        <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
          Elige que quieres ver arriba, como quieres filtrarlo a la izquierda.
        </p>
      </div>

      <section className="bg-surface-container lux-card-border overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-outline-variant">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center justify-center gap-2 px-4 py-4 font-label-sm uppercase tracking-widest transition-colors border-b-2 ${
                tab === t.value
                  ? "border-primary text-primary bg-surface"
                  : "border-transparent text-on-surface-variant hover:text-primary hover:bg-surface/60"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-outline-variant">
            {LEFT_ITEMS.map((item) => (
              <div key={item.value} className="border-b border-outline-variant last:border-b-0">
                <button
                  onClick={() => setLeftMode(item.value)}
                  className={`w-full flex items-center gap-3 px-5 py-4 font-label-sm uppercase tracking-widest transition-colors ${
                    leftMode === item.value
                      ? "text-primary bg-surface"
                      : "text-on-surface-variant hover:text-primary hover:bg-surface/60"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </button>

                {leftMode === item.value && item.value === "proyecto" && (
                  <div className="px-5 pb-5 flex flex-col gap-4">
                    <div>
                      <label className="font-label-sm text-on-surface-variant/70 uppercase block mb-1">Proyecto</label>
                      <select
                        className={selectClass}
                        value={proyectoId}
                        onChange={(e) => {
                          setProyectoId(e.target.value);
                          setObraId("");
                        }}
                      >
                        <option value="">Todos</option>
                        <option value="none">Sin proyecto</option>
                        {proyectos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-label-sm text-on-surface-variant/70 uppercase block mb-1">Obra</label>
                      <select className={selectClass} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                        <option value="">Todas</option>
                        {obraOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {leftMode === item.value && item.value === "periodo" && (
                  <div className="px-5 pb-5 flex flex-col gap-4">
                    <div>
                      <label className="font-label-sm text-on-surface-variant/70 uppercase block mb-1">Desde</label>
                      <input
                        type="date"
                        className={selectClass}
                        value={from}
                        max={to || undefined}
                        onChange={(e) => setFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-label-sm text-on-surface-variant/70 uppercase block mb-1">Hasta</label>
                      <input
                        type="date"
                        className={selectClass}
                        value={to}
                        min={from || undefined}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex-1 min-w-0 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <p className="font-body-md text-on-surface-variant max-w-xl">{TAB_DESCRIPTION[tab]}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setValuesVisible((v) => !v)}
                  className="border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors font-label-sm uppercase tracking-widest px-4 py-3 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {valuesVisible ? "visibility_off" : "visibility"}
                  </span>
                  {valuesVisible ? "Ocultar valores" : "Mostrar valores"}
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={isExporting !== null || rows.length === 0}
                  className={exportButtonClass}
                >
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  {isExporting === "pdf" ? "Generando..." : "PDF"}
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  disabled={isExporting !== null || rows.length === 0}
                  className={exportButtonClass}
                >
                  <span className="material-symbols-outlined text-[18px]">table_chart</span>
                  {isExporting === "excel" ? "Generando..." : "Excel"}
                </button>
              </div>
            </div>

            {error && <p className="text-error font-label-sm uppercase mb-4">{error}</p>}
            {isLoading && <p className="font-label-sm uppercase text-on-surface-variant py-8">Cargando...</p>}

            {!isLoading && rows.length === 0 && (
              <p className="text-on-surface-variant/60 font-label-sm uppercase py-8">
                Sin datos que coincidan con los filtros seleccionados.
              </p>
            )}

            {!isLoading && rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest">
                      {columns.map((c) => (
                        <th key={c.header} className={`py-2 pr-4 ${c.align === "right" ? "text-right" : "text-left"}`}>
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, i) => (
                      <tr key={i} className="border-b border-outline-variant/50 font-body-md text-on-surface">
                        {columns.map((c) => (
                          <td key={c.header} className={`py-3 pr-4 ${c.align === "right" ? "text-right" : "text-left"}`}>
                            {c.render(row, valuesVisible)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && rows.length > 0 && <Pagination {...pagination} onPageChange={pagination.setPage} />}
          </div>
        </div>
      </section>
    </div>
  );
}
