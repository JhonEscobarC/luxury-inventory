import { Prisma, HistorialTipo, type HistorialEvento } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { endOfDay } from "../../utils/dates";

function serializeEvento(evento: HistorialEvento) {
  return {
    id: evento.id,
    tipo: evento.tipo,
    descripcion: evento.descripcion,
    monto: evento.monto === null ? null : Number(evento.monto),
    createdAt: evento.createdAt,
    userName: evento.userName,
    obraId: evento.obraId,
    obraName: evento.obraName,
    proveedorId: evento.proveedorId,
    proveedorName: evento.proveedorName,
    contratistaId: evento.contratistaId,
    contratistaName: evento.contratistaName,
    orderId: evento.orderId,
    asignacionId: evento.asignacionId,
    abonoId: evento.abonoId,
  };
}

export interface RecordEventoInput {
  tipo: HistorialTipo;
  descripcion: string;
  monto?: number | null;
  userId?: string | null;
  obraId?: string | null;
  proveedorId?: string | null;
  contratistaId?: string | null;
  orderId?: string | null;
  asignacionId?: string | null;
  abonoId?: string | null;
}

// No lanza si falla: registrar el historial nunca debe tumbar la operacion principal.
export async function recordEvento(input: RecordEventoInput) {
  try {
    const [user, obra, proveedor, contratista] = await Promise.all([
      input.userId ? prisma.user.findUnique({ where: { id: input.userId }, select: { name: true } }) : null,
      input.obraId ? prisma.obra.findUnique({ where: { id: input.obraId }, select: { name: true } }) : null,
      input.proveedorId
        ? prisma.proveedor.findUnique({ where: { id: input.proveedorId }, select: { name: true } })
        : null,
      input.contratistaId
        ? prisma.contratista.findUnique({ where: { id: input.contratistaId }, select: { name: true } })
        : null,
    ]);

    await prisma.historialEvento.create({
      data: {
        tipo: input.tipo,
        descripcion: input.descripcion,
        monto: input.monto ?? null,
        userName: user?.name ?? null,
        obraId: input.obraId ?? null,
        obraName: obra?.name ?? null,
        proveedorId: input.proveedorId ?? null,
        proveedorName: proveedor?.name ?? null,
        contratistaId: input.contratistaId ?? null,
        contratistaName: contratista?.name ?? null,
        orderId: input.orderId ?? null,
        asignacionId: input.asignacionId ?? null,
        abonoId: input.abonoId ?? null,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar el evento de historial:", error);
  }
}

export interface ListHistorialFilters {
  tipo?: HistorialTipo;
  obraId?: string;
  proveedorId?: string;
  contratistaId?: string;
  from?: Date;
  to?: Date;
}

export async function listHistorial(filters: ListHistorialFilters) {
  const where: Prisma.HistorialEventoWhereInput = {};
  if (filters.tipo) where.tipo = filters.tipo;
  if (filters.obraId) where.obraId = filters.obraId;
  if (filters.proveedorId) where.proveedorId = filters.proveedorId;
  if (filters.contratistaId) where.contratistaId = filters.contratistaId;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from && { gte: filters.from }),
      ...(filters.to && { lte: endOfDay(filters.to) }),
    };
  }

  const eventos = await prisma.historialEvento.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return eventos.map(serializeEvento);
}
