import { OrderStatus, FormaPago } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { endOfDay } from "../../utils/dates";

export interface ObraFinanciero {
  obraId: string;
  obraName: string;
  isActive: boolean;
  proyectoId: string | null;
  gastoMaterial: number;
  gastoOperacion: number;
  total: number;
}

export interface ProyectoFinanciero {
  proyectoId: string;
  proyectoName: string;
  isActive: boolean;
  obras: ObraFinanciero[];
  gastoMaterial: number;
  gastoOperacion: number;
  total: number;
}

export interface GastosFilters {
  proyectoIds?: string[]; // "none" incluye obras sin proyecto
  obraIds?: string[];
  categoriaId?: string;
  proveedorId?: string;
  contratistaId?: string;
  from?: Date;
  to?: Date;
  material?: string;
}

export interface GastoPedidoDetalle {
  orderId: string;
  obraId: string;
  obraName: string;
  proveedorName: string | null;
  categoriaName: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  createdAt: Date;
}

export interface GastoContratistaDetalle {
  obraId: string;
  obraName: string;
  contratistaName: string;
  totalAmount: number;
  createdAt: Date;
}

export interface GastosReport {
  proyectos: ProyectoFinanciero[];
  obrasSinProyecto: ObraFinanciero[];
  pedidosDetalle: GastoPedidoDetalle[];
  contratistasDetalle: GastoContratistaDetalle[];
}

// Version filtrable de getFinancieroReport: permite acotar por proyecto/obra, categoria
// de inventario, proveedor, contratista, fechas y texto libre de material, y ademas
// devuelve el detalle (pedidos y asignaciones a contratistas) que compone cada total,
// pensado para exportarse como anexo del reporte.
export async function getGastosReport(filters: GastosFilters = {}): Promise<GastosReport> {
  const obras = await prisma.obra.findMany({
    include: { proyecto: { select: { id: true, name: true, isActive: true } } },
    orderBy: { name: "asc" },
  });

  let allowedObraIds: Set<string> | null = null;
  if (filters.obraIds && filters.obraIds.length > 0) {
    allowedObraIds = new Set(filters.obraIds);
  } else if (filters.proyectoIds && filters.proyectoIds.length > 0) {
    const wantsSinProyecto = filters.proyectoIds.includes("none");
    allowedObraIds = new Set(
      obras
        .filter(
          (o) => (o.proyectoId && filters.proyectoIds!.includes(o.proyectoId)) || (wantsSinProyecto && !o.proyectoId),
        )
        .map((o) => o.id),
    );
  }

  const dateWhere =
    filters.from || filters.to
      ? { createdAt: { ...(filters.from && { gte: filters.from }), ...(filters.to && { lte: endOfDay(filters.to) }) } }
      : {};

  const orders = await prisma.order.findMany({
    where: {
      status: OrderStatus.DESPACHADO,
      ...(allowedObraIds && { obraId: { in: Array.from(allowedObraIds) } }),
      ...dateWhere,
    },
    include: { items: { include: { categoria: true, proveedor: true } }, obra: true, proveedor: true },
  });

  const materialQuery = filters.material?.trim().toLowerCase();
  const materialByObra = new Map<string, number>();
  const pedidosDetalle: GastoPedidoDetalle[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      if (item.unitPrice === null) continue;
      const effectiveProveedorId = item.proveedorId ?? order.proveedorId;
      if (filters.categoriaId && item.categoriaId !== filters.categoriaId) continue;
      if (filters.proveedorId && effectiveProveedorId !== filters.proveedorId) continue;
      if (materialQuery && !item.description.toLowerCase().includes(materialQuery)) continue;

      const subtotal = Number(item.quantity) * Number(item.unitPrice);
      materialByObra.set(order.obraId, (materialByObra.get(order.obraId) ?? 0) + subtotal);
      pedidosDetalle.push({
        orderId: order.id,
        obraId: order.obraId,
        obraName: order.obra.name,
        proveedorName: item.proveedor?.name ?? order.proveedor?.name ?? null,
        categoriaName: item.categoria?.name ?? null,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        subtotal,
        createdAt: order.createdAt,
      });
    }
  }

  // Los gastos de operacion (contratistas) no tienen categoria, proveedor de material ni
  // texto de material propios: si alguno de esos filtros esta activo se excluyen del
  // calculo para no mezclar conceptos que no aplican.
  const skipOperacion = !!(filters.categoriaId || filters.proveedorId || materialQuery);

  const asignaciones = skipOperacion
    ? []
    : await prisma.contratistaAsignacion.findMany({
        where: {
          ...(allowedObraIds && { obraId: { in: Array.from(allowedObraIds) } }),
          ...(filters.contratistaId && { contratistaId: filters.contratistaId }),
          ...dateWhere,
        },
        include: { obra: true, contratista: true },
      });

  const operacionByObra = new Map<string, number>();
  const contratistasDetalle: GastoContratistaDetalle[] = [];
  for (const asignacion of asignaciones) {
    operacionByObra.set(asignacion.obraId, (operacionByObra.get(asignacion.obraId) ?? 0) + Number(asignacion.totalAmount));
    contratistasDetalle.push({
      obraId: asignacion.obraId,
      obraName: asignacion.obra.name,
      contratistaName: asignacion.contratista.name,
      totalAmount: Number(asignacion.totalAmount),
      createdAt: asignacion.createdAt,
    });
  }

  const relevantObras = allowedObraIds ? obras.filter((o) => allowedObraIds!.has(o.id)) : obras;

  const obraFinancieros: ObraFinanciero[] = relevantObras.map((obra) => {
    const gastoMaterial = materialByObra.get(obra.id) ?? 0;
    const gastoOperacion = operacionByObra.get(obra.id) ?? 0;
    return {
      obraId: obra.id,
      obraName: obra.name,
      isActive: obra.isActive,
      proyectoId: obra.proyectoId,
      gastoMaterial,
      gastoOperacion,
      total: gastoMaterial + gastoOperacion,
    };
  });

  const proyectosMap = new Map<string, ProyectoFinanciero>();
  const obrasSinProyecto: ObraFinanciero[] = [];

  for (const obraFin of obraFinancieros) {
    if (!obraFin.proyectoId) {
      obrasSinProyecto.push(obraFin);
      continue;
    }
    const obraModel = relevantObras.find((o) => o.id === obraFin.obraId)!;
    if (!proyectosMap.has(obraFin.proyectoId)) {
      proyectosMap.set(obraFin.proyectoId, {
        proyectoId: obraFin.proyectoId,
        proyectoName: obraModel.proyecto!.name,
        isActive: obraModel.proyecto!.isActive,
        obras: [],
        gastoMaterial: 0,
        gastoOperacion: 0,
        total: 0,
      });
    }
    const proyecto = proyectosMap.get(obraFin.proyectoId)!;
    proyecto.obras.push(obraFin);
    proyecto.gastoMaterial += obraFin.gastoMaterial;
    proyecto.gastoOperacion += obraFin.gastoOperacion;
    proyecto.total += obraFin.total;
  }

  return {
    proyectos: Array.from(proyectosMap.values()).sort((a, b) => a.proyectoName.localeCompare(b.proyectoName)),
    obrasSinProyecto,
    pedidosDetalle,
    contratistasDetalle,
  };
}

export async function getProveedorSaldo(proveedorId: string): Promise<number> {
  const [orders, abonoSum] = await Promise.all([
    // Solo los pedidos a credito generan deuda: los de contado ya quedaron pagados
    // al momento de la compra. Se consultan todos (no solo los de este proveedor)
    // porque con proveedor-por-item el proveedor efectivo se decide item a item.
    prisma.order.findMany({
      where: { status: OrderStatus.DESPACHADO, formaPago: FormaPago.CREDITO },
      include: { items: true },
    }),
    prisma.abono.aggregate({ where: { proveedorId }, _sum: { amount: true } }),
  ]);

  const totalDespachado = orders.reduce((sum, order) => {
    return (
      sum +
      order.items.reduce((s, item) => {
        const effectiveProveedorId = item.proveedorId ?? order.proveedorId;
        if (effectiveProveedorId !== proveedorId || item.unitPrice === null) return s;
        return s + Number(item.quantity) * Number(item.unitPrice);
      }, 0)
    );
  }, 0);
  const totalAbonado = Number(abonoSum._sum.amount ?? 0);

  return totalDespachado - totalAbonado;
}

export interface ProveedorDeuda {
  proveedorId: string;
  proveedorName: string;
  isActive: boolean;
  totalDespachado: number;
  totalAbonado: number;
  saldo: number;
}

export async function getProveedoresDeudaReport(): Promise<ProveedorDeuda[]> {
  const [proveedores, orders, abonos] = await Promise.all([
    prisma.proveedor.findMany({ orderBy: { name: "asc" } }),
    prisma.order.findMany({
      where: { status: OrderStatus.DESPACHADO, formaPago: FormaPago.CREDITO },
      include: { items: true },
    }),
    prisma.abono.groupBy({ by: ["proveedorId"], _sum: { amount: true } }),
  ]);

  // Se agrega por item (no por pedido) porque con proveedor-por-item cada material
  // puede pertenecer a un proveedor distinto dentro del mismo pedido.
  const despachadoByProveedor = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      const effectiveProveedorId = item.proveedorId ?? order.proveedorId;
      if (!effectiveProveedorId || item.unitPrice === null) continue;
      const subtotal = Number(item.quantity) * Number(item.unitPrice);
      despachadoByProveedor.set(effectiveProveedorId, (despachadoByProveedor.get(effectiveProveedorId) ?? 0) + subtotal);
    }
  }

  const abonadoByProveedor = new Map<string, number>();
  for (const group of abonos) {
    abonadoByProveedor.set(group.proveedorId, Number(group._sum.amount ?? 0));
  }

  return proveedores
    .map((proveedor) => {
      const totalDespachado = despachadoByProveedor.get(proveedor.id) ?? 0;
      const totalAbonado = abonadoByProveedor.get(proveedor.id) ?? 0;
      return {
        proveedorId: proveedor.id,
        proveedorName: proveedor.name,
        isActive: proveedor.isActive,
        totalDespachado,
        totalAbonado,
        saldo: totalDespachado - totalAbonado,
      };
    })
    .sort((a, b) => b.saldo - a.saldo);
}

// Cuanto ha pagado el comprador de una obra hacia su precio de venta.
export async function getObraSaldoCliente(obraId: string) {
  const [obra, abonoSum] = await Promise.all([
    prisma.obra.findUnique({ where: { id: obraId } }),
    prisma.abonoCliente.aggregate({ where: { obraId }, _sum: { amount: true } }),
  ]);
  if (!obra) return null;

  const precioVenta = obra.precioVenta === null ? null : Number(obra.precioVenta);
  const totalAbonado = Number(abonoSum._sum.amount ?? 0);
  return {
    precioVenta,
    totalAbonado,
    saldo: precioVenta === null ? null : precioVenta - totalAbonado,
  };
}

export interface ObraClientes {
  obraId: string;
  obraName: string;
  client: string | null;
  isActive: boolean;
  proyectoId: string | null;
  precioVenta: number | null;
  totalAbonado: number;
  saldo: number | null;
}

export interface ProyectoClientes {
  proyectoId: string;
  proyectoName: string;
  isActive: boolean;
  obras: ObraClientes[];
  precioVenta: number;
  totalAbonado: number;
}

export interface ClientesReport {
  proyectos: ProyectoClientes[];
  obrasSinProyecto: ObraClientes[];
  totalPrecioVenta: number;
  totalAbonado: number;
}

export async function getClientesReport(): Promise<ClientesReport> {
  const [obras, abonos] = await Promise.all([
    prisma.obra.findMany({
      include: { proyecto: { select: { id: true, name: true, isActive: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.abonoCliente.groupBy({ by: ["obraId"], _sum: { amount: true } }),
  ]);

  const abonadoByObra = new Map<string, number>();
  for (const group of abonos) {
    abonadoByObra.set(group.obraId, Number(group._sum.amount ?? 0));
  }

  const obraClientesList: ObraClientes[] = obras.map((obra) => {
    const precioVenta = obra.precioVenta === null ? null : Number(obra.precioVenta);
    const totalAbonado = abonadoByObra.get(obra.id) ?? 0;
    return {
      obraId: obra.id,
      obraName: obra.name,
      client: obra.client,
      isActive: obra.isActive,
      proyectoId: obra.proyectoId,
      precioVenta,
      totalAbonado,
      saldo: precioVenta === null ? null : precioVenta - totalAbonado,
    };
  });

  const proyectosMap = new Map<string, ProyectoClientes>();
  const obrasSinProyecto: ObraClientes[] = [];

  for (const obraCli of obraClientesList) {
    if (!obraCli.proyectoId) {
      obrasSinProyecto.push(obraCli);
      continue;
    }
    const obraModel = obras.find((o) => o.id === obraCli.obraId)!;
    if (!proyectosMap.has(obraCli.proyectoId)) {
      proyectosMap.set(obraCli.proyectoId, {
        proyectoId: obraCli.proyectoId,
        proyectoName: obraModel.proyecto!.name,
        isActive: obraModel.proyecto!.isActive,
        obras: [],
        precioVenta: 0,
        totalAbonado: 0,
      });
    }
    const proyecto = proyectosMap.get(obraCli.proyectoId)!;
    proyecto.obras.push(obraCli);
    proyecto.precioVenta += obraCli.precioVenta ?? 0;
    proyecto.totalAbonado += obraCli.totalAbonado;
  }

  return {
    proyectos: Array.from(proyectosMap.values()).sort((a, b) => a.proyectoName.localeCompare(b.proyectoName)),
    obrasSinProyecto,
    totalPrecioVenta: obraClientesList.reduce((sum, o) => sum + (o.precioVenta ?? 0), 0),
    totalAbonado: obraClientesList.reduce((sum, o) => sum + o.totalAbonado, 0),
  };
}
