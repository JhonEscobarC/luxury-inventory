import { Prisma, HistorialTipo, type Abono, type MetodoPago, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordEvento } from "../historial/historial.service";
import { getProveedorSaldo } from "../reports/reports.service";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function serializeAbono(abono: Abono & { createdBy?: Pick<User, "id" | "name"> | null }) {
  return {
    id: abono.id,
    amount: Number(abono.amount),
    notes: abono.notes,
    metodoPago: abono.metodoPago,
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
  metodoPago: MetodoPago;
}

export async function createAbono(input: CreateAbonoInput, createdById: string) {
  if (input.amount <= 0) {
    throw new HttpError(400, "El monto del abono debe ser mayor a cero");
  }
  const proveedor = await prisma.proveedor.findUnique({ where: { id: input.proveedorId } });
  if (!proveedor) {
    throw new HttpError(404, "Proveedor no encontrado");
  }

  const saldo = await getProveedorSaldo(input.proveedorId);
  if (input.amount > saldo) {
    throw new HttpError(
      400,
      saldo > 0
        ? `El abono no puede superar el saldo pendiente (${currencyFormatter.format(saldo)})`
        : `Este proveedor no tiene saldo pendiente por abonar`,
    );
  }

  const abono = await prisma.abono.create({
    data: {
      proveedorId: input.proveedorId,
      amount: input.amount,
      notes: input.notes ?? null,
      metodoPago: input.metodoPago,
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
