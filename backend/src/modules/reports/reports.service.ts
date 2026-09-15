import { OrderStatus, FormaPago } from "@prisma/client";
import { prisma } from "../../lib/prisma";

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

export interface FinancieroReport {
  proyectos: ProyectoFinanciero[];
  obrasSinProyecto: ObraFinanciero[];
}

// Gastos de material: pedidos DESPACHADOS con precios asignados por obra.
// Gastos de operacion: monto total de las asignaciones a contratistas por obra.
export async function getFinancieroReport(): Promise<FinancieroReport> {
  const [obras, orders, asignaciones] = await Promise.all([
    prisma.obra.findMany({
      include: { proyecto: { select: { id: true, name: true, isActive: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.order.findMany({
      where: { status: OrderStatus.DESPACHADO },
      include: { items: true },
    }),
    prisma.contratistaAsignacion.findMany(),
  ]);

  const materialByObra = new Map<string, number>();
  for (const order of orders) {
    const hasAllPrices = order.items.every((item) => item.unitPrice !== null);
    if (!hasAllPrices) continue;
    const total = order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
    materialByObra.set(order.obraId, (materialByObra.get(order.obraId) ?? 0) + total);
  }

  const operacionByObra = new Map<string, number>();
  for (const asignacion of asignaciones) {
    operacionByObra.set(
      asignacion.obraId,
      (operacionByObra.get(asignacion.obraId) ?? 0) + Number(asignacion.totalAmount),
    );
  }

  const obraFinancieros: ObraFinanciero[] = obras.map((obra) => {
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
    const obraModel = obras.find((o) => o.id === obraFin.obraId)!;
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
