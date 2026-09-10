import { useEffect, useState } from "react";
import { listAllProductsForReport, listCategories } from "../lib/products";
import { listOrders } from "../lib/orders";
import { listObras } from "../lib/obras";
import { listProveedores } from "../lib/proveedores";
import { exportInventoryExcel, exportInventoryPdf, exportOrdersExcel, exportOrdersPdf } from "../lib/exporters";
import type { Order, OrderStatus } from "../types/order";
import type { Obra } from "../types/obra";
import type { Proveedor } from "../types/proveedor";

const ORDER_STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "DESPACHADO", label: "Despachado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  DESPACHADO: "Despachado",
  CANCELADO: "Cancelado",
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const selectClass =
  "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3";
const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";
const exportButtonClass =
  "flex-1 border border-primary text-primary font-label-sm uppercase px-4 py-3 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";

function summarize(orders: Order[]) {
  const total = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
  const byStatus: Record<OrderStatus, number> = { PENDIENTE: 0, CONFIRMADO: 0, DESPACHADO: 0, CANCELADO: 0 };
  orders.forEach((order) => {
    byStatus[order.status] += 1;
  });
  return { count: orders.length, total, byStatus };
}

interface SummaryCardsProps {
  summary: ReturnType<typeof summarize>;
}

function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
      <div className="border border-outline-variant p-4">
        <p className="font-label-sm text-on-surface-variant uppercase mb-1">Pedidos</p>
        <p className="text-headline-md-mobile text-on-surface">{summary.count}</p>
      </div>
      <div className="border border-outline-variant p-4">
        <p className="font-label-sm text-on-surface-variant uppercase mb-1">Total gastado</p>
        <p className="text-headline-md-mobile text-primary">{currencyFormatter.format(summary.total)}</p>
      </div>
      <div className="border border-outline-variant p-4 col-span-2 sm:col-span-1">
        <p className="font-label-sm text-on-surface-variant uppercase mb-2">Por estado</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {(Object.keys(summary.byStatus) as OrderStatus[])
            .filter((status) => summary.byStatus[status] > 0)
            .map((status) => (
              <span key={status} className="font-label-sm text-on-surface-variant">
                {STATUS_LABEL[status]}: <span className="text-on-surface">{summary.byStatus[status]}</span>
              </span>
            ))}
          {summary.count === 0 && <span className="font-label-sm text-on-surface-variant">-</span>}
        </div>
      </div>
    </div>
  );
}

export function Reports() {
  const [categories, setCategories] = useState<string[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [inventoryCategory, setInventoryCategory] = useState("");
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<string | null>(null);
  const [isExportingInventory, setIsExportingInventory] = useState<"pdf" | "excel" | null>(null);

  const [orderStatus, setOrderStatus] = useState<OrderStatus | "">("");
  const [orderFrom, setOrderFrom] = useState("");
  const [orderTo, setOrderTo] = useState("");
  const [ordersStatus, setOrdersStatus] = useState<string | null>(null);
  const [isExportingOrders, setIsExportingOrders] = useState<"pdf" | "excel" | null>(null);

  const [selectedObraId, setSelectedObraId] = useState("");
  const [obraOrders, setObraOrders] = useState<Order[]>([]);
  const [isLoadingObraOrders, setIsLoadingObraOrders] = useState(false);
  const [isExportingObra, setIsExportingObra] = useState<"pdf" | "excel" | null>(null);

  const [selectedProveedorId, setSelectedProveedorId] = useState("");
  const [proveedorOrders, setProveedorOrders] = useState<Order[]>([]);
  const [isLoadingProveedorOrders, setIsLoadingProveedorOrders] = useState(false);
  const [isExportingProveedor, setIsExportingProveedor] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
    listObras({ isActive: true })
      .then((items) => {
        setObras(items);
        if (items[0]) setSelectedObraId(items[0].id);
      })
      .catch(() => setObras([]));
    listProveedores({ isActive: true })
      .then((items) => {
        setProveedores(items);
        if (items[0]) setSelectedProveedorId(items[0].id);
      })
      .catch(() => setProveedores([]));
  }, []);

  useEffect(() => {
    if (!selectedObraId) {
      setObraOrders([]);
      return;
    }
    setIsLoadingObraOrders(true);
    listOrders({ obraId: selectedObraId })
      .then(setObraOrders)
      .catch(() => setObraOrders([]))
      .finally(() => setIsLoadingObraOrders(false));
  }, [selectedObraId]);

  useEffect(() => {
    if (!selectedProveedorId) {
      setProveedorOrders([]);
      return;
    }
    setIsLoadingProveedorOrders(true);
    listOrders({ proveedorId: selectedProveedorId })
      .then(setProveedorOrders)
      .catch(() => setProveedorOrders([]))
      .finally(() => setIsLoadingProveedorOrders(false));
  }, [selectedProveedorId]);

  async function handleInventoryExport(format: "pdf" | "excel") {
    setIsExportingInventory(format);
    setInventoryStatus(null);
    try {
      const products = await listAllProductsForReport({
        category: inventoryCategory || undefined,
        lowStock: inventoryLowStockOnly,
      });
      if (products.length === 0) {
        setInventoryStatus("No hay productos que coincidan con los filtros seleccionados.");
        return;
      }
      if (format === "pdf") {
        exportInventoryPdf(products);
      } else {
        await exportInventoryExcel(products);
      }
      setInventoryStatus(`Exportados ${products.length} producto(s).`);
    } catch {
      setInventoryStatus("No se pudo generar el reporte de inventario.");
    } finally {
      setIsExportingInventory(null);
    }
  }

  async function handleOrdersExport(format: "pdf" | "excel") {
    setIsExportingOrders(format);
    setOrdersStatus(null);
    try {
      const orders = await listOrders({
        status: orderStatus || undefined,
        from: orderFrom || undefined,
        to: orderTo || undefined,
      });
      if (orders.length === 0) {
        setOrdersStatus("No hay pedidos que coincidan con los filtros seleccionados.");
        return;
      }
      if (format === "pdf") {
        exportOrdersPdf(orders);
      } else {
        await exportOrdersExcel(orders);
      }
      setOrdersStatus(`Exportados ${orders.length} pedido(s).`);
    } catch {
      setOrdersStatus("No se pudo generar el reporte de pedidos.");
    } finally {
      setIsExportingOrders(null);
    }
  }

  async function handleObraExport(format: "pdf" | "excel") {
    if (obraOrders.length === 0) return;
    const obraName = obras.find((o) => o.id === selectedObraId)?.name ?? "obra";
    const options = { title: `Reporte de Pedidos - ${obraName}`, filenamePrefix: obraName };
    setIsExportingObra(format);
    try {
      if (format === "pdf") {
        exportOrdersPdf(obraOrders, options);
      } else {
        await exportOrdersExcel(obraOrders, options);
      }
    } finally {
      setIsExportingObra(null);
    }
  }

  async function handleProveedorExport(format: "pdf" | "excel") {
    if (proveedorOrders.length === 0) return;
    const proveedorName = proveedores.find((p) => p.id === selectedProveedorId)?.name ?? "proveedor";
    const options = { title: `Reporte de Pedidos - ${proveedorName}`, filenamePrefix: proveedorName };
    setIsExportingProveedor(format);
    try {
      if (format === "pdf") {
        exportOrdersPdf(proveedorOrders, options);
      } else {
        await exportOrdersExcel(proveedorOrders, options);
      }
    } finally {
      setIsExportingProveedor(null);
    }
  }

  const obraSummary = summarize(obraOrders);
  const proveedorSummary = summarize(proveedorOrders);

  return (
    <div>
      <div className="mb-12">
        <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Reportes</h2>
        <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
          Genera y descarga reportes de inventario, pedidos, obras y proveedores en PDF o Excel.
        </p>
      </div>

      <section className="bg-surface-container lux-card-border p-6 md:p-8 mb-10">
        <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
          <span className="material-symbols-outlined text-primary">inventory_2</span>
          <h3 className="text-headline-md-mobile text-on-surface uppercase">Inventario</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className={labelClass}>Categoria</label>
            <select
              className={selectClass}
              value={inventoryCategory}
              onChange={(event) => setInventoryCategory(event.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 font-label-sm text-on-surface-variant uppercase tracking-widest cursor-pointer">
              <input
                type="checkbox"
                checked={inventoryLowStockOnly}
                onChange={(event) => setInventoryLowStockOnly(event.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Solo stock bajo
            </label>
          </div>
        </div>

        {inventoryStatus && (
          <p className="font-label-sm uppercase text-on-surface-variant mb-4">{inventoryStatus}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleInventoryExport("pdf")}
            disabled={isExportingInventory !== null}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {isExportingInventory === "pdf" ? "Generando..." : "Exportar PDF"}
          </button>
          <button
            onClick={() => handleInventoryExport("excel")}
            disabled={isExportingInventory !== null}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            {isExportingInventory === "excel" ? "Generando..." : "Exportar Excel"}
          </button>
        </div>
      </section>

      <section className="bg-surface-container lux-card-border p-6 md:p-8 mb-10">
        <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
          <span className="material-symbols-outlined text-primary">assignment</span>
          <h3 className="text-headline-md-mobile text-on-surface uppercase">Pedidos (general)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div>
            <label className={labelClass}>Estado</label>
            <select
              className={selectClass}
              value={orderStatus}
              onChange={(event) => setOrderStatus(event.target.value as OrderStatus | "")}
            >
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Desde</label>
            <input
              type="date"
              className={selectClass}
              value={orderFrom}
              onChange={(event) => setOrderFrom(event.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Hasta</label>
            <input
              type="date"
              className={selectClass}
              value={orderTo}
              onChange={(event) => setOrderTo(event.target.value)}
            />
          </div>
        </div>

        {ordersStatus && <p className="font-label-sm uppercase text-on-surface-variant mb-4">{ordersStatus}</p>}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleOrdersExport("pdf")}
            disabled={isExportingOrders !== null}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {isExportingOrders === "pdf" ? "Generando..." : "Exportar PDF"}
          </button>
          <button
            onClick={() => handleOrdersExport("excel")}
            disabled={isExportingOrders !== null}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            {isExportingOrders === "excel" ? "Generando..." : "Exportar Excel"}
          </button>
        </div>
      </section>

      <section className="bg-surface-container lux-card-border p-6 md:p-8 mb-10">
        <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
          <span className="material-symbols-outlined text-primary">construction</span>
          <h3 className="text-headline-md-mobile text-on-surface uppercase">Reporte por obra</h3>
        </div>

        <div className="mb-6">
          <label className={labelClass}>Obra</label>
          <select className={selectClass} value={selectedObraId} onChange={(e) => setSelectedObraId(e.target.value)}>
            {obras.length === 0 && <option value="">Sin obras registradas</option>}
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.name}
              </option>
            ))}
          </select>
        </div>

        {isLoadingObraOrders && <p className="font-label-sm uppercase text-on-surface-variant mb-6">Cargando...</p>}

        {!isLoadingObraOrders && <SummaryCards summary={obraSummary} />}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleObraExport("pdf")}
            disabled={isExportingObra !== null || obraOrders.length === 0}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {isExportingObra === "pdf" ? "Generando..." : "Exportar PDF"}
          </button>
          <button
            onClick={() => handleObraExport("excel")}
            disabled={isExportingObra !== null || obraOrders.length === 0}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            {isExportingObra === "excel" ? "Generando..." : "Exportar Excel"}
          </button>
        </div>
      </section>

      <section className="bg-surface-container lux-card-border p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
          <span className="material-symbols-outlined text-primary">local_shipping</span>
          <h3 className="text-headline-md-mobile text-on-surface uppercase">Reporte por proveedor</h3>
        </div>

        <div className="mb-6">
          <label className={labelClass}>Proveedor</label>
          <select
            className={selectClass}
            value={selectedProveedorId}
            onChange={(e) => setSelectedProveedorId(e.target.value)}
          >
            {proveedores.length === 0 && <option value="">Sin proveedores registrados</option>}
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.name}
              </option>
            ))}
          </select>
        </div>

        {isLoadingProveedorOrders && (
          <p className="font-label-sm uppercase text-on-surface-variant mb-6">Cargando...</p>
        )}

        {!isLoadingProveedorOrders && <SummaryCards summary={proveedorSummary} />}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleProveedorExport("pdf")}
            disabled={isExportingProveedor !== null || proveedorOrders.length === 0}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {isExportingProveedor === "pdf" ? "Generando..." : "Exportar PDF"}
          </button>
          <button
            onClick={() => handleProveedorExport("excel")}
            disabled={isExportingProveedor !== null || proveedorOrders.length === 0}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            {isExportingProveedor === "excel" ? "Generando..." : "Exportar Excel"}
          </button>
        </div>
      </section>
    </div>
  );
}
