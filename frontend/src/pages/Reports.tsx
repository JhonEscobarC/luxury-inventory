import { useEffect, useMemo, useState } from "react";
import { listProyectos } from "../lib/proyectos";
import { listObras } from "../lib/obras";
import { getCuentasReport, getTablaDetalle, getTablaReport } from "../lib/reports";
import { displayCurrency } from "../lib/currency";
import { exportTablaExcel, exportTablaPdf } from "../lib/exporters";
import type { TablaColumn, TablaExcelSection, TablaPdfSection } from "../lib/exporters";
import type { Proyecto } from "../types/proyecto";
import type { Obra } from "../types/obra";
import type {
  CuentaRow,
  TablaClienteAbonoRow,
  TablaClienteRow,
  TablaContratistaEtapaRow,
  TablaContratistaRow,
  TablaInventarioRow,
  TablaProveedorCompraRow,
  TablaProveedorPagoRow,
  TablaProveedorRow,
  TablaTab,
} from "../types/report";
import { usePagination } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";

const FORMA_PAGO_LABEL: Record<string, string> = { CONTADO: "Contado", CREDITO: "Credito" };
const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
};
const ETAPA_STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  COMPLETADA: "Completada",
  PAGADA: "Pagada",
};

function fecha(value: string) {
  return new Date(value).toLocaleDateString("es-CO");
}

type LeftMode = "cuentas" | "proyecto" | "periodo";
type Row = TablaInventarioRow | TablaProveedorRow | TablaContratistaRow | TablaClienteRow;
type ReportsTab = TablaTab | "plancuentas";

const TABS: { value: ReportsTab; label: string; icon: string }[] = [
  { value: "inventario", label: "Inventario", icon: "inventory_2" },
  { value: "proveedores", label: "Proveedores", icon: "local_shipping" },
  { value: "contratistas", label: "Contratistas", icon: "engineering" },
  { value: "clientes", label: "Clientes", icon: "payments" },
  { value: "plancuentas", label: "Plan de Cuentas", icon: "account_balance" },
];

const CUENTA_GROUP_LABEL: Record<string, string> = {
  Disponible: "Disponible (Caja y Bancos)",
  Deudores: "Deudores",
  Inventarios: "Inventarios",
  Proveedores: "Proveedores",
  "Cuentas por pagar": "Cuentas por pagar",
  Gastos: "Gastos",
};

const LEFT_ITEMS: { value: LeftMode; label: string; icon: string }[] = [
  { value: "cuentas", label: "Cuentas", icon: "account_balance_wallet" },
  { value: "proyecto", label: "Proyecto", icon: "apartment" },
  { value: "periodo", label: "Periodo", icon: "date_range" },
];

const TAB_DESCRIPTION: Record<ReportsTab, string> = {
  inventario: "Todo lo que hay registrado en inventario, con su valor.",
  proveedores: "Cuanto se les ha gastado, cuanto se les ha pagado y cuanto se les debe.",
  contratistas: "Cuanto se les ha asignado, cuanto se les ha pagado y cuanto se les debe.",
  clientes: "Cuanto han abonado los compradores y el saldo pendiente de cada obra.",
  plancuentas: "Saldo general de la empresa por cuenta: Caja, Bancos, Clientes, Inventarios, Proveedores, Contratistas y Gastos.",
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
        { header: "Cantidad", align: "right", render: (r) => `${(r as TablaInventarioRow).quantity} ${(r as TablaInventarioRow).unit}`, exportKey: "quantity", exportValue: (r) => `${(r as TablaInventarioRow).quantity} ${(r as TablaInventarioRow).unit}` },
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
        { header: "Precio venta", align: "right", render: (r, v) => money((r as TablaClienteRow).precioVenta, v), exportKey: "precioVenta", exportValue: (r) => (r as TablaClienteRow).precioVenta ?? "-" },
        { header: "Abonado", align: "right", render: (r, v) => money((r as TablaClienteRow).totalAbonado, v), exportKey: "totalAbonado", exportValue: (r) => (r as TablaClienteRow).totalAbonado },
        { header: "Saldo", align: "right", render: (r, v) => money((r as TablaClienteRow).saldoActual, v), exportKey: "saldoActual", exportValue: (r) => (r as TablaClienteRow).saldoActual ?? "-" },
      ];
  }
}

// Columnas que solo se agregan al exportar Inventario (no ocupan espacio en la tabla en
// pantalla, que se mantiene como resumen), para que el archivo exportado quede mas completo.
const INVENTARIO_EXPORT_EXTRA: ColumnDef[] = [
  {
    header: "Proveedor",
    render: (r) => (r as TablaInventarioRow).proveedorName ?? "-",
    exportKey: "proveedorName",
    exportValue: (r) => (r as TablaInventarioRow).proveedorName ?? "-",
  },
  {
    header: "Fecha de registro",
    render: (r) => fecha((r as TablaInventarioRow).createdAt),
    exportKey: "createdAt",
    exportValue: (r) => fecha((r as TablaInventarioRow).createdAt),
  },
];

const selectClass =
  "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3";
const exportButtonClass =
  "border border-primary text-primary font-label-sm uppercase px-4 py-3 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";

export function Reports() {
  const [tab, setTab] = useState<ReportsTab>("inventario");
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

  const [cuentas, setCuentas] = useState<CuentaRow[]>([]);
  const [cuentasLoading, setCuentasLoading] = useState(true);
  const [cuentasError, setCuentasError] = useState<string | null>(null);

  useEffect(() => {
    listProyectos({ isActive: true }).then(setProyectos).catch(() => setProyectos([]));
    listObras({}).then(setObras).catch(() => setObras([]));
  }, []);

  const obraOptions = useMemo(() => {
    if (!proyectoId) return obras;
    if (proyectoId === "none") return obras.filter((o) => !o.proyectoId);
    return obras.filter((o) => o.proyectoId === proyectoId);
  }, [obras, proyectoId]);

  const filters = useMemo(
    () =>
      leftMode === "proyecto"
        ? { proyectoId: proyectoId || undefined, obraId: obraId || undefined }
        : leftMode === "periodo"
          ? { from: from || undefined, to: to || undefined }
          : {},
    [leftMode, proyectoId, obraId, from, to],
  );

  useEffect(() => {
    if (tab === "plancuentas") return;
    setIsLoading(true);
    setError(null);
    getTablaReport<Row>(tab, filters)
      .then(setRows)
      .catch(() => setError("No se pudo cargar el reporte."))
      .finally(() => setIsLoading(false));
  }, [tab, filters]);

  useEffect(() => {
    if (tab !== "plancuentas") return;
    setCuentasLoading(true);
    setCuentasError(null);
    getCuentasReport()
      .then(setCuentas)
      .catch(() => setCuentasError("No se pudo cargar el plan de cuentas."))
      .finally(() => setCuentasLoading(false));
  }, [tab]);

  const columns = useMemo(() => (tab === "plancuentas" ? [] : columnsFor(tab)), [tab]);
  const { pageItems: pageRows, ...pagination } = usePagination(rows);

  async function buildDetailSections(): Promise<{ pdf: TablaPdfSection[]; excel: TablaExcelSection[] }> {
    if (tab === "proveedores") {
      const { compras, pagos } = await getTablaDetalle<{
        compras: TablaProveedorCompraRow[];
        pagos: TablaProveedorPagoRow[];
      }>("proveedores", filters);
      return {
        pdf: [
          {
            title: "Detalle de compras",
            headers: ["Proveedor", "Obra", "Proyecto", "Material", "Cant.", "Unidad", "Precio", "Subtotal", "Forma de pago", "Fecha"],
            rows: compras.map((c) => [
              c.proveedorName,
              c.obraName,
              c.proyectoName ?? "-",
              c.description,
              c.quantity,
              c.unit,
              c.unitPrice.toLocaleString("es-CO"),
              c.subtotal.toLocaleString("es-CO"),
              c.formaPago ? (FORMA_PAGO_LABEL[c.formaPago] ?? c.formaPago) : "-",
              fecha(c.createdAt),
            ]),
          },
          {
            title: "Detalle de pagos",
            headers: ["Proveedor", "Monto", "Notas", "Registrado por", "Fecha"],
            rows: pagos.map((p) => [p.proveedorName, p.amount.toLocaleString("es-CO"), p.notes ?? "-", p.createdByName ?? "-", fecha(p.createdAt)]),
          },
        ],
        excel: [
          {
            title: "Detalle de compras",
            columns: [
              { header: "Proveedor", key: "proveedorName", width: 22 },
              { header: "Obra", key: "obraName", width: 22 },
              { header: "Proyecto", key: "proyectoName", width: 22 },
              { header: "Material", key: "description", width: 28 },
              { header: "Cantidad", key: "quantity", width: 12 },
              { header: "Unidad", key: "unit", width: 12 },
              { header: "Precio unitario", key: "unitPrice", width: 16 },
              { header: "Subtotal", key: "subtotal", width: 16 },
              { header: "Forma de pago", key: "formaPago", width: 16 },
              { header: "Fecha", key: "createdAt", width: 14 },
            ],
            rows: compras.map((c) => ({
              proveedorName: c.proveedorName,
              obraName: c.obraName,
              proyectoName: c.proyectoName ?? "-",
              description: c.description,
              quantity: c.quantity,
              unit: c.unit,
              unitPrice: c.unitPrice,
              subtotal: c.subtotal,
              formaPago: c.formaPago ? (FORMA_PAGO_LABEL[c.formaPago] ?? c.formaPago) : "-",
              createdAt: fecha(c.createdAt),
            })),
          },
          {
            title: "Detalle de pagos",
            columns: [
              { header: "Proveedor", key: "proveedorName", width: 22 },
              { header: "Monto", key: "amount", width: 16 },
              { header: "Notas", key: "notes", width: 28 },
              { header: "Registrado por", key: "createdByName", width: 20 },
              { header: "Fecha", key: "createdAt", width: 14 },
            ],
            rows: pagos.map((p) => ({
              proveedorName: p.proveedorName,
              amount: p.amount,
              notes: p.notes ?? "-",
              createdByName: p.createdByName ?? "-",
              createdAt: fecha(p.createdAt),
            })),
          },
        ],
      };
    }

    if (tab === "contratistas") {
      const { etapas } = await getTablaDetalle<{ etapas: TablaContratistaEtapaRow[] }>("contratistas", filters);
      return {
        pdf: [
          {
            title: "Detalle de etapas",
            headers: ["Contratista", "Obra", "Proyecto", "Etapa", "%", "Monto", "Estado", "Completada", "Pagada", "Asignacion"],
            rows: etapas.map((e) => [
              e.contratistaName,
              e.obraName,
              e.proyectoName ?? "-",
              e.etapaName,
              `${e.percentage}%`,
              e.monto.toLocaleString("es-CO"),
              ETAPA_STATUS_LABEL[e.status] ?? e.status,
              e.completedAt ? fecha(e.completedAt) : "-",
              e.paidAt ? fecha(e.paidAt) : "-",
              fecha(e.createdAt),
            ]),
          },
        ],
        excel: [
          {
            title: "Detalle de etapas",
            columns: [
              { header: "Contratista", key: "contratistaName", width: 22 },
              { header: "Obra", key: "obraName", width: 22 },
              { header: "Proyecto", key: "proyectoName", width: 22 },
              { header: "Etapa", key: "etapaName", width: 18 },
              { header: "Porcentaje", key: "percentage", width: 12 },
              { header: "Monto", key: "monto", width: 16 },
              { header: "Estado", key: "status", width: 14 },
              { header: "Completada", key: "completedAt", width: 14 },
              { header: "Pagada", key: "paidAt", width: 14 },
              { header: "Asignacion", key: "createdAt", width: 14 },
            ],
            rows: etapas.map((e) => ({
              contratistaName: e.contratistaName,
              obraName: e.obraName,
              proyectoName: e.proyectoName ?? "-",
              etapaName: e.etapaName,
              percentage: e.percentage,
              monto: e.monto,
              status: ETAPA_STATUS_LABEL[e.status] ?? e.status,
              completedAt: e.completedAt ? fecha(e.completedAt) : "-",
              paidAt: e.paidAt ? fecha(e.paidAt) : "-",
              createdAt: fecha(e.createdAt),
            })),
          },
        ],
      };
    }

    if (tab === "clientes") {
      const { abonos } = await getTablaDetalle<{ abonos: TablaClienteAbonoRow[] }>("clientes", filters);
      return {
        pdf: [
          {
            title: "Detalle de abonos",
            headers: ["Obra", "Proyecto", "Comprador", "Monto", "Forma de pago", "Metodo", "Notas", "Registrado por", "Fecha"],
            rows: abonos.map((a) => [
              a.obraName,
              a.proyectoName ?? "-",
              a.client ?? "-",
              a.amount.toLocaleString("es-CO"),
              a.formaPago ? (FORMA_PAGO_LABEL[a.formaPago] ?? a.formaPago) : "-",
              a.metodoPago ? (METODO_PAGO_LABEL[a.metodoPago] ?? a.metodoPago) : "-",
              a.notes ?? "-",
              a.createdByName ?? "-",
              fecha(a.createdAt),
            ]),
          },
        ],
        excel: [
          {
            title: "Detalle de abonos",
            columns: [
              { header: "Obra", key: "obraName", width: 22 },
              { header: "Proyecto", key: "proyectoName", width: 22 },
              { header: "Comprador", key: "client", width: 22 },
              { header: "Monto", key: "amount", width: 16 },
              { header: "Forma de pago", key: "formaPago", width: 16 },
              { header: "Metodo", key: "metodoPago", width: 16 },
              { header: "Notas", key: "notes", width: 26 },
              { header: "Registrado por", key: "createdByName", width: 20 },
              { header: "Fecha", key: "createdAt", width: 14 },
            ],
            rows: abonos.map((a) => ({
              obraName: a.obraName,
              proyectoName: a.proyectoName ?? "-",
              client: a.client ?? "-",
              amount: a.amount,
              formaPago: a.formaPago ? (FORMA_PAGO_LABEL[a.formaPago] ?? a.formaPago) : "-",
              metodoPago: a.metodoPago ? (METODO_PAGO_LABEL[a.metodoPago] ?? a.metodoPago) : "-",
              notes: a.notes ?? "-",
              createdByName: a.createdByName ?? "-",
              createdAt: fecha(a.createdAt),
            })),
          },
        ],
      };
    }

    return { pdf: [], excel: [] };
  }

  async function handleExportCuentas(format: "pdf" | "excel") {
    if (cuentas.length === 0) return;
    setIsExporting(format);
    try {
      const title = "Reporte General de Cuentas";
      const headers = ["Codigo", "Grupo", "Cuenta", "Saldo"];
      if (format === "pdf") {
        const body = cuentas.map((c) => [c.codigo, CUENTA_GROUP_LABEL[c.grupo] ?? c.grupo, c.nombre, c.saldo.toLocaleString("es-CO")]);
        await exportTablaPdf(title, headers, body, { filenamePrefix: "plan-cuentas" });
      } else {
        const excelColumns: TablaColumn[] = [
          { header: "Codigo", key: "codigo", width: 12 },
          { header: "Grupo", key: "grupo", width: 24 },
          { header: "Cuenta", key: "nombre", width: 24 },
          { header: "Saldo", key: "saldo", width: 18 },
        ];
        const excelRows = cuentas.map((c) => ({
          codigo: c.codigo,
          grupo: CUENTA_GROUP_LABEL[c.grupo] ?? c.grupo,
          nombre: c.nombre,
          saldo: c.saldo,
        }));
        await exportTablaExcel(title, excelColumns, excelRows, { filenamePrefix: "plan-cuentas" });
      }
    } finally {
      setIsExporting(null);
    }
  }

  async function handleExport(format: "pdf" | "excel") {
    if (tab === "plancuentas") return handleExportCuentas(format);
    if (rows.length === 0) return;
    setIsExporting(format);
    try {
      const title = `Reporte de ${TABS.find((t) => t.value === tab)!.label}`;
      const exportColumns = tab === "inventario" ? [...columns, ...INVENTARIO_EXPORT_EXTRA] : columns;
      const { pdf: pdfSections, excel: excelSections } = await buildDetailSections();

      if (format === "pdf") {
        const headers = exportColumns.map((c) => c.header);
        const body = rows.map((row) => exportColumns.map((c) => c.exportValue(row)));
        await exportTablaPdf(title, headers, body, { filenamePrefix: tab, sections: pdfSections });
      } else {
        const excelColumns: TablaColumn[] = exportColumns.map((c) => ({
          header: c.header,
          key: c.exportKey,
          width: c.exportKey.length > 12 ? 22 : 16,
        }));
        const excelRows = rows.map((row) =>
          Object.fromEntries(exportColumns.map((c) => [c.exportKey, c.exportValue(row)])),
        );
        await exportTablaExcel(title, excelColumns, excelRows, { filenamePrefix: tab, sections: excelSections });
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
        <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-outline-variant">
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
          {tab !== "plancuentas" && (
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
          )}

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
                  disabled={isExporting !== null || (tab === "plancuentas" ? cuentas.length === 0 : rows.length === 0)}
                  className={exportButtonClass}
                >
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  {isExporting === "pdf" ? "Generando..." : "PDF"}
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  disabled={isExporting !== null || (tab === "plancuentas" ? cuentas.length === 0 : rows.length === 0)}
                  className={exportButtonClass}
                >
                  <span className="material-symbols-outlined text-[18px]">table_chart</span>
                  {isExporting === "excel" ? "Generando..." : "Excel"}
                </button>
              </div>
            </div>

            {tab === "plancuentas" ? (
              <>
                {cuentasError && <p className="text-error font-label-sm uppercase mb-4">{cuentasError}</p>}
                {cuentasLoading && <p className="font-label-sm uppercase text-on-surface-variant py-8">Cargando...</p>}
                {!cuentasLoading && cuentas.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest">
                          <th className="py-2 pr-4 text-left">Codigo</th>
                          <th className="py-2 pr-4 text-left">Grupo</th>
                          <th className="py-2 pr-4 text-left">Cuenta</th>
                          <th className="py-2 pr-4 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuentas.map((c) => (
                          <tr key={c.codigo} className="border-b border-outline-variant/50 font-body-md text-on-surface">
                            <td className="py-3 pr-4 text-on-surface-variant">{c.codigo}</td>
                            <td className="py-3 pr-4 text-on-surface-variant">{CUENTA_GROUP_LABEL[c.grupo] ?? c.grupo}</td>
                            <td className="py-3 pr-4">{c.nombre}</td>
                            <td className={`py-3 pr-4 text-right font-semibold ${c.saldo < 0 ? "text-error" : ""}`}>
                              {money(c.saldo, valuesVisible)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="font-label-sm text-on-surface-variant/60 uppercase mt-6">
                      Caja y Bancos son un estimado a partir del metodo de pago registrado en cada movimiento; los
                      abonos a proveedor o pagos a contratista registrados antes de este cambio no tienen metodo de
                      pago y no quedan incluidos ahi.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
