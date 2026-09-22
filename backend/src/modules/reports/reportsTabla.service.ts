import { OrderStatus, FormaPago, EtapaStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { endOfDay } from "../../utils/dates";

export interface TablaFilters {
  /** "none" = obras sin proyecto. */
  proyectoId?: string;
  obraId?: string;
  from?: Date;
  to?: Date;
}

export interface TablaInventarioRow {
  id: string;
  name: string;
  categoriaName: string | null;
  obraName: string;
  proyectoName: string | null;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  createdAt: Date;
}

export interface TablaProveedorRow {
  proveedorId: string;
  proveedorName: string;
  totalGastado: number;
  totalPagado: number;
  saldoActual: number;
}

export interface TablaContratistaRow {
  contratistaId: string;
  contratistaName: string;
  totalAsignado: number;
  totalPagado: number;
  saldoActual: number;
}

export interface TablaClienteRow {
  obraId: string;
  obraName: string;
  proyectoName: string | null;
  client: string | null;
  precioVenta: number | null;
  totalAbonado: number;
  saldoActual: number | null;
}

async function resolveObraIds(filters: TablaFilters): Promise<string[] | null> {
  if (filters.obraId) return [filters.obraId];
  if (filters.proyectoId) {
    const obras = await prisma.obra.findMany({
      where: filters.proyectoId === "none" ? { proyectoId: null } : { proyectoId: filters.proyectoId },
      select: { id: true },
    });
    return obras.map((o) => o.id);
  }
  return null;
}

function dateRange(from?: Date, to?: Date) {
  if (!from && !to) return {};
  return { createdAt: { ...(from && { gte: from }), ...(to && { lte: endOfDay(to) }) } };
}

export async function getTablaInventario(filters: TablaFilters): Promise<TablaInventarioRow[]> {
  const obraIds = await resolveObraIds(filters);
  const products = await prisma.product.findMany({
    where: {
      ...(obraIds && { obraId: { in: obraIds } }),
      ...dateRange(filters.from, filters.to),
    },
    include: { categoria: true, obra: { include: { proyecto: true } } },
    orderBy: { name: "asc" },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    categoriaName: p.categoria?.name ?? null,
    obraName: p.obra?.name ?? "General",
    proyectoName: p.obra?.proyecto?.name ?? null,
    quantity: Number(p.quantity),
    unit: p.unit,
    price: Number(p.price),
    total: Number(p.quantity) * Number(p.price),
    createdAt: p.createdAt,
  }));
}

// "Gastado" y "pagado" respetan obra/proyecto y periodo (son flujos); "saldoActual" es la
// deuda vigente de hoy con ese proveedor sin filtrar por fecha (los abonos no quedan
// ligados a una obra en particular, asi que tampoco se pueden acotar por obra/proyecto).
export async function getTablaProveedores(filters: TablaFilters): Promise<TablaProveedorRow[]> {
  const obraIds = await resolveObraIds(filters);
  const periodo = dateRange(filters.from, filters.to);

  const [proveedores, ordersPeriodo, ordersCreditoTodos, abonosPeriodo, abonosTodos] = await Promise.all([
    prisma.proveedor.findMany({ orderBy: { name: "asc" } }),
    prisma.order.findMany({
      where: { status: OrderStatus.DESPACHADO, ...(obraIds && { obraId: { in: obraIds } }), ...periodo },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: { status: OrderStatus.DESPACHADO, formaPago: FormaPago.CREDITO },
      include: { items: true },
    }),
    prisma.abono.findMany({ where: periodo }),
    prisma.abono.findMany(),
  ]);

  const sumByProveedor = (orders: typeof ordersPeriodo) => {
    const map = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items) {
        const effectiveProveedorId = item.proveedorId ?? order.proveedorId;
        if (!effectiveProveedorId || item.unitPrice === null) continue;
        const subtotal = Number(item.quantity) * Number(item.unitPrice);
        map.set(effectiveProveedorId, (map.get(effectiveProveedorId) ?? 0) + subtotal);
      }
    }
    return map;
  };

  const gastadoByProveedor = sumByProveedor(ordersPeriodo);
  const creditoTodos = sumByProveedor(ordersCreditoTodos);

  const pagadoByProveedor = new Map<string, number>();
  for (const abono of abonosPeriodo) {
    pagadoByProveedor.set(abono.proveedorId, (pagadoByProveedor.get(abono.proveedorId) ?? 0) + Number(abono.amount));
  }
  const pagadoTodos = new Map<string, number>();
  for (const abono of abonosTodos) {
    pagadoTodos.set(abono.proveedorId, (pagadoTodos.get(abono.proveedorId) ?? 0) + Number(abono.amount));
  }

  return proveedores
    .map((p) => ({
      proveedorId: p.id,
      proveedorName: p.name,
      totalGastado: gastadoByProveedor.get(p.id) ?? 0,
      totalPagado: pagadoByProveedor.get(p.id) ?? 0,
      saldoActual: (creditoTodos.get(p.id) ?? 0) - (pagadoTodos.get(p.id) ?? 0),
    }))
    .filter((r) => !obraIds && !filters.from && !filters.to ? true : r.totalGastado > 0 || r.totalPagado > 0);
}

// "Asignado" y "pagado" (por etapa) respetan obra/proyecto y periodo; "saldoActual" es lo
// que falta por pagar de las asignaciones vigentes, sin filtrar por fecha.
export async function getTablaContratistas(filters: TablaFilters): Promise<TablaContratistaRow[]> {
  const obraIds = await resolveObraIds(filters);
  const periodo = dateRange(filters.from, filters.to);

  const [contratistas, asignacionesPeriodo, asignacionesTodas] = await Promise.all([
    prisma.contratista.findMany({ orderBy: { name: "asc" } }),
    prisma.contratistaAsignacion.findMany({
      where: { ...(obraIds && { obraId: { in: obraIds } }), ...periodo },
      include: { etapas: true },
    }),
    prisma.contratistaAsignacion.findMany({
      where: obraIds ? { obraId: { in: obraIds } } : {},
      include: { etapas: true },
    }),
  ]);

  // El monto de cada etapa no se guarda: es un porcentaje del total de la asignacion.
  const etapaAmount = (asignacion: { totalAmount: unknown }, etapa: { percentage: unknown }) =>
    Math.round((Number(asignacion.totalAmount) * Number(etapa.percentage)) / 100);

  const asignadoByContratista = new Map<string, number>();
  const pagadoByContratista = new Map<string, number>();
  for (const asignacion of asignacionesPeriodo) {
    asignadoByContratista.set(
      asignacion.contratistaId,
      (asignadoByContratista.get(asignacion.contratistaId) ?? 0) + Number(asignacion.totalAmount),
    );
    for (const etapa of asignacion.etapas) {
      if (etapa.status !== EtapaStatus.PAGADA) continue;
      if (filters.from && (!etapa.paidAt || etapa.paidAt < filters.from)) continue;
      if (filters.to && (!etapa.paidAt || etapa.paidAt > endOfDay(filters.to))) continue;
      pagadoByContratista.set(
        asignacion.contratistaId,
        (pagadoByContratista.get(asignacion.contratistaId) ?? 0) + etapaAmount(asignacion, etapa),
      );
    }
  }

  const saldoByContratista = new Map<string, number>();
  for (const asignacion of asignacionesTodas) {
    const pagado = asignacion.etapas
      .filter((e) => e.status === EtapaStatus.PAGADA)
      .reduce((sum, e) => sum + etapaAmount(asignacion, e), 0);
    const pendiente = Number(asignacion.totalAmount) - pagado;
    saldoByContratista.set(
      asignacion.contratistaId,
      (saldoByContratista.get(asignacion.contratistaId) ?? 0) + pendiente,
    );
  }

  return contratistas
    .map((c) => ({
      contratistaId: c.id,
      contratistaName: c.name,
      totalAsignado: asignadoByContratista.get(c.id) ?? 0,
      totalPagado: pagadoByContratista.get(c.id) ?? 0,
      saldoActual: saldoByContratista.get(c.id) ?? 0,
    }))
    .filter((r) => !obraIds && !filters.from && !filters.to ? true : r.totalAsignado > 0 || r.totalPagado > 0);
}

// "Abonado" respeta obra/proyecto y periodo; "saldoActual" es el saldo real de la obra
// (precio de venta - todo lo abonado hasta hoy), sin filtrar por fecha.
export async function getTablaClientes(filters: TablaFilters): Promise<TablaClienteRow[]> {
  const obraIds = await resolveObraIds(filters);
  const periodo = dateRange(filters.from, filters.to);

  const [obras, abonosPeriodo, abonosTodos] = await Promise.all([
    prisma.obra.findMany({
      where: obraIds ? { id: { in: obraIds } } : {},
      include: { proyecto: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.abonoCliente.groupBy({ by: ["obraId"], _sum: { amount: true }, where: periodo }),
    prisma.abonoCliente.groupBy({ by: ["obraId"], _sum: { amount: true } }),
  ]);

  const abonadoPeriodoByObra = new Map(abonosPeriodo.map((g) => [g.obraId, Number(g._sum.amount ?? 0)]));
  const abonadoTodosByObra = new Map(abonosTodos.map((g) => [g.obraId, Number(g._sum.amount ?? 0)]));

  return obras
    .map((obra) => {
      const precioVenta = obra.precioVenta === null ? null : Number(obra.precioVenta);
      const abonadoTodos = abonadoTodosByObra.get(obra.id) ?? 0;
      return {
        obraId: obra.id,
        obraName: obra.name,
        proyectoName: obra.proyecto?.name ?? null,
        client: obra.client,
        precioVenta,
        totalAbonado: abonadoPeriodoByObra.get(obra.id) ?? 0,
        saldoActual: precioVenta === null ? null : precioVenta - abonadoTodos,
      };
    })
    .filter((r) => !filters.from && !filters.to ? true : r.totalAbonado > 0);
}
