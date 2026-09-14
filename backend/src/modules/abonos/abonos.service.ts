import { Prisma, HistorialTipo, type Abono, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordEvento } from "../historial/historial.service";

function serializeAbono(abono: Abono & { createdBy?: Pick<User, "id" | "name"> | null }) {
  return {
    id: abono.id,
    amount: Number(abono.amount),
    notes: abono.notes,
    proveedorId: abono.proveedorId,
    createdById: abono.createdById,
    createdByName: abono.createdBy?.name ?? null,
    createdAt: abono.createdAt,
  };
}

export interface ListAbonosFilters {
  proveedorId?: string;
}

export async function listAbonos(filters: ListAbonosFilters) {
  const where: Prisma.AbonoWhereInput = {};
  if (filters.proveedorId) where.proveedorId = filters.proveedorId;

  const abonos = await prisma.abono.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return abonos.map(serializeAbono);
}

export interface CreateAbonoInput {
  proveedorId: string;
  amount: number;
  notes?: string | null;
}

export async function createAbono(input: CreateAbonoInput, createdById: string) {
  if (input.amount <= 0) {
    throw new HttpError(400, "El monto del abono debe ser mayor a cero");
  }
  const proveedor = await prisma.proveedor.findUnique({ where: { id: input.proveedorId } });
  if (!proveedor) {
    throw new HttpError(404, "Proveedor no encontrado");
  }

  const abono = await prisma.abono.create({
    data: {
      proveedorId: input.proveedorId,
      amount: input.amount,
      notes: input.notes ?? null,
      createdById,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  const serialized = serializeAbono(abono);
  await recordEvento({
    tipo: HistorialTipo.ABONO_REGISTRADO,
    descripcion: `Abono registrado a "${proveedor.name}"`,
    monto: serialized.amount,
    userId: createdById,
    proveedorId: proveedor.id,
    abonoId: serialized.id,
  });

  return serialized;
}

export async function deleteAbono(id: string) {
  const existing = await prisma.abono.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Abono no encontrado");
  }
  await prisma.abono.delete({ where: { id } });
}
