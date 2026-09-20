import { Prisma, HistorialTipo, type GastoAdicional, type MetodoPago, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordEvento } from "../historial/historial.service";

const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: "efectivo",
  TRANSFERENCIA: "transferencia",
  TARJETA: "tarjeta",
};

function serializeGastoAdicional(
  gasto: GastoAdicional & { createdBy?: Pick<User, "id" | "name"> | null; obra?: { name: string } | null },
) {
  return {
    id: gasto.id,
    concepto: gasto.concepto,
    amount: Number(gasto.amount),
    metodoPago: gasto.metodoPago,
    notes: gasto.notes,
    obraId: gasto.obraId,
    obraName: gasto.obra?.name ?? null,
    createdById: gasto.createdById,
    createdByName: gasto.createdBy?.name ?? null,
    createdAt: gasto.createdAt,
  };
}

export interface ListGastosAdicionalesFilters {
  obraId?: string;
}

export async function listGastosAdicionales(filters: ListGastosAdicionalesFilters) {
  const where: Prisma.GastoAdicionalWhereInput = {};
  if (filters.obraId) where.obraId = filters.obraId;

  const gastos = await prisma.gastoAdicional.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } }, obra: { select: { name: true } } },
  });
  return gastos.map(serializeGastoAdicional);
}

export async function getGastoAdicional(id: string) {
  const gasto = await prisma.gastoAdicional.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true } }, obra: { select: { name: true } } },
  });
  if (!gasto) {
    throw new HttpError(404, "Gasto no encontrado");
  }
  return serializeGastoAdicional(gasto);
}

export interface CreateGastoAdicionalInput {
  concepto: string;
  amount: number;
  metodoPago: MetodoPago;
  notes?: string | null;
  obraId?: string | null;
}

export async function createGastoAdicional(input: CreateGastoAdicionalInput, createdById: string) {
  if (input.amount <= 0) {
    throw new HttpError(400, "El monto debe ser mayor a cero");
  }

  let obraName: string | null = null;
  if (input.obraId) {
    const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
    if (!obra) {
      throw new HttpError(404, "Obra no encontrada");
    }
    obraName = obra.name;
  }

  const gasto = await prisma.gastoAdicional.create({
    data: {
      concepto: input.concepto,
      amount: input.amount,
      metodoPago: input.metodoPago,
      notes: input.notes ?? null,
      obraId: input.obraId ?? null,
      createdById,
    },
    include: { createdBy: { select: { id: true, name: true } }, obra: { select: { name: true } } },
  });

  const serialized = serializeGastoAdicional(gasto);
  await recordEvento({
    tipo: HistorialTipo.GASTO_ADICIONAL_REGISTRADO,
    descripcion: `Gasto adicional registrado: "${input.concepto}"${obraName ? ` (${obraName})` : ""} - ${
      METODO_PAGO_LABEL[input.metodoPago]
    }`,
    monto: serialized.amount,
    userId: createdById,
    obraId: input.obraId ?? null,
    gastoAdicionalId: serialized.id,
  });

  return serialized;
}

export async function deleteGastoAdicional(id: string) {
  const existing = await prisma.gastoAdicional.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Gasto no encontrado");
  }
  await prisma.gastoAdicional.delete({ where: { id } });
}
