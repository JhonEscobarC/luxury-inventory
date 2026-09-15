import { Prisma, HistorialTipo, type AbonoCliente, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordEvento } from "../historial/historial.service";
import { getObraSaldoCliente } from "../reports/reports.service";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function serializeAbonoCliente(
  abono: AbonoCliente & { createdBy?: Pick<User, "id" | "name"> | null; obra?: { name: string } | null },
) {
  return {
    id: abono.id,
    amount: Number(abono.amount),
    notes: abono.notes,
    obraId: abono.obraId,
    obraName: abono.obra?.name ?? null,
    createdById: abono.createdById,
    createdByName: abono.createdBy?.name ?? null,
    createdAt: abono.createdAt,
  };
}

export interface ListAbonosClienteFilters {
  obraId?: string;
}

export async function listAbonosCliente(filters: ListAbonosClienteFilters) {
  const where: Prisma.AbonoClienteWhereInput = {};
  if (filters.obraId) where.obraId = filters.obraId;

  const abonos = await prisma.abonoCliente.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } }, obra: { select: { name: true } } },
  });
  return abonos.map(serializeAbonoCliente);
}

export interface CreateAbonoClienteInput {
  obraId: string;
  amount: number;
  notes?: string | null;
}

export async function createAbonoCliente(input: CreateAbonoClienteInput, createdById: string) {
  if (input.amount <= 0) {
    throw new HttpError(400, "El monto del abono debe ser mayor a cero");
  }
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
  if (!obra) {
    throw new HttpError(404, "Obra no encontrada");
  }

  const saldoInfo = await getObraSaldoCliente(input.obraId);
  if (saldoInfo?.saldo !== null && saldoInfo !== null && input.amount > saldoInfo.saldo) {
    throw new HttpError(
      400,
      saldoInfo.saldo > 0
        ? `El abono no puede superar el saldo pendiente (${currencyFormatter.format(saldoInfo.saldo)})`
        : "Esta obra no tiene saldo pendiente por abonar",
    );
  }

  const abono = await prisma.abonoCliente.create({
    data: {
      obraId: input.obraId,
      amount: input.amount,
      notes: input.notes ?? null,
      createdById,
    },
    include: { createdBy: { select: { id: true, name: true } }, obra: { select: { name: true } } },
  });

  const serialized = serializeAbonoCliente(abono);
  await recordEvento({
    tipo: HistorialTipo.ABONO_CLIENTE_REGISTRADO,
    descripcion: `Abono de cliente registrado para "${obra.name}"${obra.client ? ` (${obra.client})` : ""}`,
    monto: serialized.amount,
    userId: createdById,
    obraId: obra.id,
    abonoClienteId: serialized.id,
  });

  return serialized;
}

export async function deleteAbonoCliente(id: string) {
  const existing = await prisma.abonoCliente.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Abono no encontrado");
  }
  await prisma.abonoCliente.delete({ where: { id } });
}
