import { OrderStatus } from "@prisma/client";
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
      where: { status: OrderStatus.DESPACHADO, proveedorId: { not: null } },
      include: { items: true },
    }),
    prisma.abono.groupBy({ by: ["proveedorId"], _sum: { amount: true } }),
  ]);

  const despachadoByProveedor = new Map<string, number>();
  for (const order of orders) {
    if (!order.proveedorId) continue;
    const hasAllPrices = order.items.every((item) => item.unitPrice !== null);
    if (!hasAllPrices) continue;
    const total = order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
    despachadoByProveedor.set(order.proveedorId, (despachadoByProveedor.get(order.proveedorId) ?? 0) + total);
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
