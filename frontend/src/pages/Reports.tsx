import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listAllProductsForReport } from "../lib/products";
import { listCategorias } from "../lib/categorias";
import { listOrders } from "../lib/orders";
import { listObras } from "../lib/obras";
import { listProyectos } from "../lib/proyectos";
import { listProveedores } from "../lib/proveedores";
import { listContratistas } from "../lib/contratistas";
import { getClientesReport, getGastosReport, getProveedoresDeudaReport } from "../lib/reports";
import { displayCurrency } from "../lib/currency";
import {
  exportClientesExcel,
  exportClientesPdf,
  exportGastosExcel,
  exportGastosPdf,
  exportInventoryExcel,
  exportInventoryPdf,
  exportOrdersExcel,
  exportOrdersPdf,
} from "../lib/exporters";
import type { GastosExportData } from "../lib/exporters";
import type { Order, OrderStatus } from "../types/order";
import type { Obra } from "../types/obra";
import type { Proveedor } from "../types/proveedor";
import type { Categoria } from "../types/categoria";
import type { Proyecto } from "../types/proyecto";
import type { Contratista } from "../types/contratista";
import type { Product } from "../types/product";
import type { ClientesReport, GastosReport, ObraClientes, ObraFinanciero, ProveedorDeuda } from "../types/report";
import { ProveedorAbonosModal } from "../components/proveedores/ProveedorAbonosModal";

type InventorySortField = "name" | "categoriaName" | "obraName" | "quantity" | "price";

const INVENTORY_SORT_OPTIONS: { value: InventorySortField; label: string }[] = [
  { value: "name", label: "Nombre" },
  { value: "categoriaName", label: "Categoria" },
  { value: "obraName", label: "Obra" },
  { value: "quantity", label: "Cantidad" },
  { value: "price", label: "Precio" },
];

function sortProducts(products: Product[], sortBy: InventorySortField, direction: "asc" | "desc") {
  const factor = direction === "asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "quantity" || sortBy === "price") {
      comparison = a[sortBy] - b[sortBy];
    } else {
      const aValue = sortBy === "obraName" ? a.obraName ?? "General" : a[sortBy] ?? "";
      const bValue = sortBy === "obraName" ? b.obraName ?? "General" : b[sortBy] ?? "";
      comparison = aValue.localeCompare(bValue, "es");
    }
    return comparison * factor;
  });
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE: "Solicitud",
  CONFIRMADO: "Compra",
  DESPACHADO: "Recibido",
  CANCELADO: "Cancelado",
};

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
        <p className="text-headline-md-mobile text-primary">{displayCurrency(summary.total)}</p>
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
  const [searchParams] = useSearchParams();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [inventoryCategoriaId, setInventoryCategoriaId] = useState("");
  const [inventoryObraId, setInventoryObraId] = useState(() => searchParams.get("obraId") ?? "");
  const [inventoryProyectoId, setInventoryProyectoId] = useState(() =>
    searchParams.get("obraId") ? "" : searchParams.get("proyectoId") ?? "",
  );
  const [inventoryStatus, setInventoryStatus] = useState<string | null>(null);
  const [isExportingInventory, setIsExportingInventory] = useState<"pdf" | "excel" | null>(null);
  const [inventorySortBy, setInventorySortBy] = useState<InventorySortField>("name");
  const [inventorySortDir, setInventorySortDir] = useState<"asc" | "desc">("asc");

  const [selectedProveedorId, setSelectedProveedorId] = useState("");
  const [proveedorCategoriaId, setProveedorCategoriaId] = useState("");
  const [proveedorOrders, setProveedorOrders] = useState<Order[]>([]);
  const [isLoadingProveedorOrders, setIsLoadingProveedorOrders] = useState(false);
  const [isExportingProveedor, setIsExportingProveedor] = useState<"pdf" | "excel" | null>(null);

  const [contratistas, setContratistas] = useState<Contratista[]>([]);

  const [gastos, setGastos] = useState<GastosReport | null>(null);
  const [isLoadingGastos, setIsLoadingGastos] = useState(true);
  const [gastosProyectoIds, setGastosProyectoIds] = useState<string[]>([]);
  const [gastosObraIds, setGastosObraIds] = useState<string[]>([]);
  const [gastosCategoriaId, setGastosCategoriaId] = useState("");
  const [gastosProveedorId, setGastosProveedorId] = useState("");
  const [gastosContratistaId, setGastosContratistaId] = useState("");
  const [gastosMaterialInput, setGastosMaterialInput] = useState("");
  const [gastosMaterial, setGastosMaterial] = useState("");
  const [gastosFrom, setGastosFrom] = useState("");
  const [gastosTo, setGastosTo] = useState("");
  const [gastosIncludeInactive, setGastosIncludeInactive] = useState(true);
  const [isExportingGastos, setIsExportingGastos] = useState<"pdf" | "excel" | null>(null);
  const [gastosStatus, setGastosStatus] = useState<string | null>(null);

  const [deudas, setDeudas] = useState<ProveedorDeuda[]>([]);
  const [isLoadingDeudas, setIsLoadingDeudas] = useState(true);
  const [deudaSort, setDeudaSort] = useState<"desc" | "asc">("desc");
  const [abonosProveedor, setAbonosProveedor] = useState<Proveedor | null>(null);

  const [clientes, setClientes] = useState<ClientesReport | null>(null);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [isExportingClientes, setIsExportingClientes] = useState<"pdf" | "excel" | null>(null);
  const [clientesStatus, setClientesStatus] = useState<string | null>(null);

  useEffect(() => {
    listCategorias({ isActive: true }).then(setCategorias).catch(() => setCategorias([]));
    listObras({ isActive: true })
      .then((items) => {
        setObras(items);
        // Si se llego con ?obraId= desde una card de Obra, precargar tambien su
        // proyecto para que el select de Obra quede consistente con el de Proyecto.
        const obraIdParam = searchParams.get("obraId");
        if (obraIdParam) {
          const obra = items.find((o) => o.id === obraIdParam);
          if (obra) setInventoryProyectoId(obra.proyectoId ?? "none");
        }
      })
      .catch(() => setObras([]));
    listProyectos({ isActive: true }).then(setProyectos).catch(() => setProyectos([]));
    listProveedores({ isActive: true })
      .then((items) => {
        setProveedores(items);
        if (items[0]) setSelectedProveedorId(items[0].id);
      })
      .catch(() => setProveedores([]));
    listContratistas({ isActive: true }).then(setContratistas).catch(() => setContratistas([]));
    refreshDeudas();
    refreshClientes();
  }, []);

  // Filtro de texto libre por material: se debounce para no repetir la consulta al
  // backend en cada tecla.
  useEffect(() => {
    const timeout = setTimeout(() => setGastosMaterial(gastosMaterialInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [gastosMaterialInput]);

  useEffect(() => {
    setIsLoadingGastos(true);
    getGastosReport({
      proyectoIds: gastosProyectoIds.length > 0 ? gastosProyectoIds : undefined,
      obraIds: gastosObraIds.length > 0 ? gastosObraIds : undefined,
      categoriaId: gastosCategoriaId || undefined,
      proveedorId: gastosProveedorId || undefined,
      contratistaId: gastosContratistaId || undefined,
      material: gastosMaterial || undefined,
      from: gastosFrom || undefined,
      to: gastosTo || undefined,
    })
      .then(setGastos)
      .catch(() => setGastos(null))
      .finally(() => setIsLoadingGastos(false));
  }, [
    gastosProyectoIds,
    gastosObraIds,
    gastosCategoriaId,
    gastosProveedorId,
    gastosContratistaId,
    gastosMaterial,
    gastosFrom,
    gastosTo,
  ]);

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

  function toggleGastosProyecto(id: string) {
    setGastosProyectoIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
    setGastosObraIds([]);
  }

  function toggleGastosObra(id: string) {
    setGastosObraIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function sumObras(obrasList: ObraFinanciero[]) {
    return obrasList.reduce(
      (acc, o) => ({
        gastoMaterial: acc.gastoMaterial + o.gastoMaterial,
        gastoOperacion: acc.gastoOperacion + o.gastoOperacion,
        total: acc.total + o.total,
      }),
      { gastoMaterial: 0, gastoOperacion: 0, total: 0 },
    );
  }

  // Filtra el reporte de gastos por si se incluyen obras inactivas (proyecto, obra,
  // categoria, proveedor, contratista, fechas y material ya se filtraron en el backend);
  // las casillas por obra siguen permitiendo afinar el total dentro de lo filtrado.
  const filteredGastos = useMemo(() => {
    if (!gastos) return null;
    const matchesObra = (obra: ObraFinanciero) => gastosIncludeInactive || obra.isActive;
    const proyectos = gastos.proyectos
      .map((p) => ({ ...p, obras: p.obras.filter(matchesObra) }))
      .filter((p) => p.obras.length > 0);
    const obrasSinProyecto = gastos.obrasSinProyecto.filter(matchesObra);
    return { proyectos, obrasSinProyecto };
  }, [gastos, gastosIncludeInactive]);

  // El multi-select de Obra del reporte de Gastos solo muestra las obras de los
  // proyectos elegidos (o todas si no se eligio ningun proyecto).
  const gastosObraOptions = useMemo(() => {
    if (gastosProyectoIds.length === 0) return obras;
    const wantsSinProyecto = gastosProyectoIds.includes("none");
    return obras.filter(
      (o) => (o.proyectoId && gastosProyectoIds.includes(o.proyectoId)) || (wantsSinProyecto && !o.proyectoId),
    );
  }, [obras, gastosProyectoIds]);

  const allObrasFlat = useMemo(
    () =>
      filteredGastos
        ? [...filteredGastos.proyectos.flatMap((p) => p.obras), ...filteredGastos.obrasSinProyecto]
        : [],
    [filteredGastos],
  );

  // El select de Obra del reporte de Inventario queda bloqueado hasta elegir un
  // proyecto; luego solo muestra las obras de ese proyecto (o las que no tienen
  // proyecto, cuando se elige "Sin proyecto").
  const inventoryObraOptions = useMemo(() => {
    if (!inventoryProyectoId || inventoryProyectoId === "general") return [];
    if (inventoryProyectoId === "none") return obras.filter((o) => !o.proyectoId);
    return obras.filter((o) => o.proyectoId === inventoryProyectoId);
  }, [obras, inventoryProyectoId]);
  const isInventoryObraLocked = !inventoryProyectoId || inventoryProyectoId === "general";
  const grandTotal = useMemo(() => sumObras(allObrasFlat), [allObrasFlat]);

  const sortedDeudas = useMemo(
    () => [...deudas].sort((a, b) => (deudaSort === "desc" ? b.saldo - a.saldo : a.saldo - b.saldo)),
    [deudas, deudaSort],
  );

  useEffect(() => {
    if (!selectedProveedorId) {
      setProveedorOrders([]);
      return;
    }
    setIsLoadingProveedorOrders(true);
    listOrders({ proveedorId: selectedProveedorId, categoriaId: proveedorCategoriaId || undefined })
      .then(setProveedorOrders)
      .catch(() => setProveedorOrders([]))
      .finally(() => setIsLoadingProveedorOrders(false));
  }, [selectedProveedorId, proveedorCategoriaId]);

  async function handleInventoryExport(format: "pdf" | "excel") {
    setIsExportingInventory(format);
    setInventoryStatus(null);
    try {
      const isGeneral = inventoryProyectoId === "general";
      const allProducts = await listAllProductsForReport({
        categoriaId: inventoryCategoriaId || undefined,
        obraId: isGeneral ? "none" : inventoryObraId || undefined,
        proyectoId: !isGeneral && !inventoryObraId ? inventoryProyectoId || undefined : undefined,
      });
      // Los materiales agotados (cantidad 0) ya no representan stock real disponible
      // en la obra, asi que no se cuentan en este reporte.
      const products = sortProducts(
        allProducts.filter((product) => product.quantity > 0),
        inventorySortBy,
        inventorySortDir,
      );
      if (products.length === 0) {
        setInventoryStatus("No hay productos que coincidan con los filtros seleccionados.");
        return;
      }

      let scopeName: string | undefined;
      if (isGeneral) {
        scopeName = "General";
      } else if (inventoryObraId) {
        scopeName = obras.find((o) => o.id === inventoryObraId)?.name;
      } else if (inventoryProyectoId === "none") {
        scopeName = "Sin proyecto";
      } else if (inventoryProyectoId) {
        scopeName = proyectos.find((p) => p.id === inventoryProyectoId)?.name;
      }
      const options = scopeName
        ? { title: `Reporte de Inventario - ${scopeName}`, filenamePrefix: scopeName }
        : undefined;

      if (format === "pdf") {
        await exportInventoryPdf(products, options);
      } else {
        await exportInventoryExcel(products, options);
      }
      setInventoryStatus(`Exportados ${products.length} producto(s).`);
    } catch {
      setInventoryStatus("No se pudo generar el reporte de inventario.");
    } finally {
      setIsExportingInventory(null);
    }
  }

  async function handleProveedorExport(format: "pdf" | "excel") {
    if (proveedorOrders.length === 0) return;
    const proveedorName = proveedores.find((p) => p.id === selectedProveedorId)?.name ?? "proveedor";
    const options = { title: `Reporte de Pedidos - ${proveedorName}`, filenamePrefix: proveedorName };
    setIsExportingProveedor(format);
    try {
      if (format === "pdf") {
        await exportOrdersPdf(proveedorOrders, options);
      } else {
        await exportOrdersExcel(proveedorOrders, options);
      }
    } finally {
      setIsExportingProveedor(null);
    }
  }

  async function handleGastosExport(format: "pdf" | "excel") {
    if (!filteredGastos || !gastos) return;
    const visibleObraIds = new Set(allObrasFlat.map((o) => o.obraId));

    const resumen: GastosExportData["resumen"] = [
      ...filteredGastos.proyectos.flatMap((p) =>
        p.obras.map((o) => ({
          proyectoName: p.proyectoName,
          obraName: o.obraName,
          gastoMaterial: o.gastoMaterial,
          gastoOperacion: o.gastoOperacion,
          total: o.total,
        })),
      ),
      ...filteredGastos.obrasSinProyecto.map((o) => ({
        proyectoName: "Sin proyecto",
        obraName: o.obraName,
        gastoMaterial: o.gastoMaterial,
        gastoOperacion: o.gastoOperacion,
        total: o.total,
      })),
    ];

    if (resumen.length === 0) {
      setGastosStatus("No hay obras que coincidan con los filtros seleccionados.");
      return;
    }

    const data: GastosExportData = {
      resumen,
      pedidos: gastos.pedidosDetalle.filter((p) => visibleObraIds.has(p.obraId)),
      contratistas: gastos.contratistasDetalle.filter((c) => visibleObraIds.has(c.obraId)),
    };

    let scopeName: string | undefined;
    if (gastosObraIds.length === 1) {
      scopeName = gastosObraOptions.find((o) => o.id === gastosObraIds[0])?.name;
    } else if (gastosProyectoIds.length === 1 && gastosProyectoIds[0] !== "none") {
      scopeName = proyectos.find((p) => p.id === gastosProyectoIds[0])?.name;
    }
    const options = scopeName ? { title: `Reporte de Gastos - ${scopeName}`, filenamePrefix: scopeName } : undefined;

    setIsExportingGastos(format);
    setGastosStatus(null);
    try {
      if (format === "pdf") {
        await exportGastosPdf(data, options);
      } else {
        await exportGastosExcel(data, options);
      }
      setGastosStatus(`Exportadas ${resumen.length} obra(s), ${data.pedidos.length} material(es) y ${data.contratistas.length} asignacion(es).`);
    } finally {
      setIsExportingGastos(null);
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <label className={labelClass}>Categoria</label>
            <select
              className={selectClass}
              value={inventoryCategoriaId}
              onChange={(event) => setInventoryCategoriaId(event.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Proyecto</label>
            <select
              className={selectClass}
              value={inventoryProyectoId}
              onChange={(event) => {
                setInventoryProyectoId(event.target.value);
                setInventoryObraId("");
              }}
            >
              <option value="">Todos</option>
              <option value="general">General (sin obra)</option>
              <option value="none">Sin proyecto</option>
              {proyectos.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>
                  {proyecto.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Obra</label>
            <select
              className={`${selectClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              value={inventoryObraId}
              disabled={isInventoryObraLocked}
              onChange={(event) => setInventoryObraId(event.target.value)}
            >
              <option value="">Todas</option>
              {inventoryObraOptions.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.name}
                </option>
              ))}
            </select>
            {isInventoryObraLocked && (
              <p className="font-label-sm text-on-surface-variant/60 uppercase mt-2">
                Elige un proyecto para filtrar por obra
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Ordenar por</label>
            <div className="flex gap-2">
              <select
                className={selectClass}
                value={inventorySortBy}
                onChange={(event) => setInventorySortBy(event.target.value as InventorySortField)}
              >
                {INVENTORY_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setInventorySortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                title={inventorySortDir === "asc" ? "Ascendente" : "Descendente"}
                className="shrink-0 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors px-3"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {inventorySortDir === "asc" ? "arrow_upward" : "arrow_downward"}
                </span>
              </button>
            </div>
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
          <span className="material-symbols-outlined text-primary">local_shipping</span>
          <h3 className="text-headline-md-mobile text-on-surface uppercase">Reporte por proveedor</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
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

          <div>
            <label className={labelClass}>Categoria</label>
            <select
              className={selectClass}
              value={proveedorCategoriaId}
              onChange={(event) => setProveedorCategoriaId(event.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.name}
                </option>
              ))}
            </select>
          </div>
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

      <section className="bg-surface-container lux-card-border p-6 md:p-8 mb-10">
        <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
          <span className="material-symbols-outlined text-primary">apartment</span>
          <h3 className="text-headline-md-mobile text-on-surface uppercase">Gastos generales</h3>
        </div>
        <p className="font-body-md text-on-surface-variant mb-6">
          Gastos de material (pedidos despachados) y de operacion (contratistas), con todos los filtros: proyectos,
          obras, categoria, proveedor, contratista, materiales y fechas. Los montos y el detalle solo se ven al
          exportar.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div>
            <label className={labelClass}>Proyectos</label>
            <div className="border border-outline-variant max-h-40 overflow-y-auto p-3 flex flex-col gap-2">
              <label className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={gastosProyectoIds.length === 0}
                  onChange={() => {
                    setGastosProyectoIds([]);
                    setGastosObraIds([]);
                  }}
                  className="w-4 h-4 accent-primary shrink-0"
                />
                Todos
              </label>
              <label className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={gastosProyectoIds.includes("none")}
                  onChange={() => toggleGastosProyecto("none")}
                  className="w-4 h-4 accent-primary shrink-0"
                />
                Sin proyecto
              </label>
              {proyectos.map((proyecto) => (
                <label
                  key={proyecto.id}
                  className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={gastosProyectoIds.includes(proyecto.id)}
                    onChange={() => toggleGastosProyecto(proyecto.id)}
                    className="w-4 h-4 accent-primary shrink-0"
                  />
                  {proyecto.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Obras</label>
            <div className="border border-outline-variant max-h-40 overflow-y-auto p-3 flex flex-col gap-2">
              <label className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={gastosObraIds.length === 0}
                  onChange={() => setGastosObraIds([])}
                  className="w-4 h-4 accent-primary shrink-0"
                />
                Todas
              </label>
              {gastosObraOptions.map((obra) => (
                <label key={obra.id} className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gastosObraIds.includes(obra.id)}
                    onChange={() => toggleGastosObra(obra.id)}
                    className="w-4 h-4 accent-primary shrink-0"
                  />
                  {obra.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <label className={labelClass}>Categoria</label>
              <select
                className={selectClass}
                value={gastosCategoriaId}
                onChange={(event) => setGastosCategoriaId(event.target.value)}
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Proveedor</label>
              <select
                className={selectClass}
                value={gastosProveedorId}
                onChange={(event) => setGastosProveedorId(event.target.value)}
              >
                <option value="">Todos</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Contratista</label>
            <select
              className={selectClass}
              value={gastosContratistaId}
              onChange={(event) => setGastosContratistaId(event.target.value)}
            >
              <option value="">Todos</option>
              {contratistas.map((contratista) => (
                <option key={contratista.id} value={contratista.id}>
                  {contratista.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Material</label>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              className={selectClass}
              value={gastosMaterialInput}
              onChange={(event) => setGastosMaterialInput(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Desde</label>
              <input
                type="date"
                className={selectClass}
                value={gastosFrom}
                max={gastosTo || undefined}
                onChange={(event) => setGastosFrom(event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Hasta</label>
              <input
                type="date"
                className={selectClass}
                value={gastosTo}
                min={gastosFrom || undefined}
                onChange={(event) => setGastosTo(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end pb-3">
            <label className="flex items-center gap-3 font-body-md text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={gastosIncludeInactive}
                onChange={(event) => setGastosIncludeInactive(event.target.checked)}
                className="w-4 h-4 accent-primary shrink-0"
              />
              Incluir obras inactivas
            </label>
          </div>
        </div>

        {isLoadingGastos && <p className="font-label-sm uppercase text-on-surface-variant mb-6">Cargando...</p>}

        {!isLoadingGastos && filteredGastos && (
          <div className="flex flex-col gap-4">
            {allObrasFlat.length === 0 ? (
              <p className="text-on-surface-variant/60 font-label-sm uppercase px-2 py-6">
                Sin obras que coincidan con los filtros
              </p>
            ) : (
              <>
                <div className="border border-primary p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <span className="font-label-sm uppercase text-on-surface-variant">
                    Total general ({allObrasFlat.length} obra(s))
                  </span>
                  <MoneyStats
                    items={[
                      { label: "Material", value: displayCurrency(grandTotal.gastoMaterial) },
                      { label: "Operacion", value: displayCurrency(grandTotal.gastoOperacion) },
                      { label: "Total", value: displayCurrency(grandTotal.total), emphasize: true },
                    ]}
                  />
                </div>

                <p className="font-label-sm uppercase text-on-surface-variant/70">
                  {gastos?.pedidosDetalle.length ?? 0} material(es) de pedidos y {gastos?.contratistasDetalle.length ?? 0}{" "}
                  asignacion(es) de contratista incluidos en el detalle al exportar.
                </p>
              </>
            )}
          </div>
        )}

        {gastosStatus && <p className="font-label-sm uppercase text-on-surface-variant mt-6">{gastosStatus}</p>}

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            onClick={() => handleGastosExport("pdf")}
            disabled={isExportingGastos !== null}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {isExportingGastos === "pdf" ? "Generando..." : "Exportar PDF"}
          </button>
          <button
            onClick={() => handleGastosExport("excel")}
            disabled={isExportingGastos !== null}
            className={exportButtonClass}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            {isExportingGastos === "excel" ? "Generando..." : "Exportar Excel"}
          </button>
        </div>
      </section>

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
                      { label: "Precio venta", value: displayCurrency(proyecto.precioVenta) },
                      { label: "Abonado", value: displayCurrency(proyecto.totalAbonado) },
                      {
                        label: "Saldo",
                        value: displayCurrency(proyecto.precioVenta - proyecto.totalAbonado),
                        emphasize: true,
                      },
                    ]}
                  />
                </div>
                <div className="flex flex-col">
                  {proyecto.obras.map((obra) => (
                    <ObraClientesRow key={obra.obraId} obra={obra} />
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
                    <ObraClientesRow key={obra.obraId} obra={obra} />
                  ))}
                </div>
              </div>
            )}

            <div className="border border-primary p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <span className="font-label-sm uppercase text-on-surface-variant">Total general</span>
              <MoneyStats
                items={[
                  { label: "Precio venta", value: displayCurrency(clientes.totalPrecioVenta) },
                  { label: "Abonado", value: displayCurrency(clientes.totalAbonado) },
                  {
                    label: "Saldo",
                    value: displayCurrency(clientes.totalPrecioVenta - clientes.totalAbonado),
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
                  {displayCurrency(deuda.totalDespachado)}
                </div>
                <div className="md:col-span-2 font-body-md text-on-surface-variant">
                  <span className="md:hidden font-label-sm uppercase text-on-surface-variant/70 mr-1">Abonado:</span>
                  {displayCurrency(deuda.totalAbonado)}
                </div>
                <div className="md:col-span-2 font-body-md font-semibold">
                  <span className="md:hidden font-label-sm uppercase text-on-surface-variant/70 mr-1 font-normal">
                    Saldo:
                  </span>
                  <span className={deuda.saldo > 0 ? "text-error" : "text-on-surface-variant"}>
                    {displayCurrency(deuda.saldo)}
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


function ObraClientesRow({ obra }: { obra: ObraClientes }) {
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
            value: obra.precioVenta !== null ? displayCurrency(obra.precioVenta) : "Sin definir",
          },
          { label: "Abonado", value: displayCurrency(obra.totalAbonado) },
          {
            label: "Saldo",
            value: obra.saldo !== null ? displayCurrency(obra.saldo) : "-",
            emphasize: obra.saldo !== null && obra.saldo > 0,
          },
        ]}
      />
    </div>
  );
}

interface MoneyStatsProps {
  items: { label: string; value: string; emphasize?: boolean }[];
}

function MoneyStats({ items }: MoneyStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-1 sm:flex sm:gap-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col min-w-0">
          <span className="font-label-sm text-on-surface-variant uppercase tracking-wider truncate">
            {item.label}
          </span>
          <span
            className={`font-body-md normal-case truncate ${item.emphasize ? "text-primary font-semibold" : "text-on-surface"}`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
