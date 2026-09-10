import { useEffect, useState } from "react";
import { listAllProductsForReport, listCategories } from "../lib/products";
import { listOrders } from "../lib/orders";
import { exportInventoryExcel, exportInventoryPdf, exportOrdersExcel, exportOrdersPdf } from "../lib/exporters";
import type { OrderStatus } from "../types/order";

const ORDER_STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "DESPACHADO", label: "Despachado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const selectClass =
  "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3";
const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";
const exportButtonClass =
  "flex-1 border border-primary text-primary font-label-sm uppercase px-4 py-3 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";

export function Reports() {
  const [categories, setCategories] = useState<string[]>([]);

  const [inventoryCategory, setInventoryCategory] = useState("");
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<string | null>(null);
  const [isExportingInventory, setIsExportingInventory] = useState<"pdf" | "excel" | null>(null);

  const [orderStatus, setOrderStatus] = useState<OrderStatus | "">("");
  const [orderFrom, setOrderFrom] = useState("");
  const [orderTo, setOrderTo] = useState("");
  const [ordersStatus, setOrdersStatus] = useState<string | null>(null);
  const [isExportingOrders, setIsExportingOrders] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

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

  return (
    <div>
      <div className="mb-12">
        <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Reportes</h2>
        <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
          Genera y descarga reportes de inventario y pedidos en PDF o Excel.
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

      <section className="bg-surface-container lux-card-border p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
          <span className="material-symbols-outlined text-primary">assignment</span>
          <h3 className="text-headline-md-mobile text-on-surface uppercase">Pedidos</h3>
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
    </div>
  );
}
