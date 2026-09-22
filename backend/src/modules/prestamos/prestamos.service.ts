import { HistorialTipo, type MetodoPago, type Prestamo, type PrestamoPago, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordEvento } from "../historial/historial.service";

const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: "efectivo",
  TRANSFERENCIA: "transferencia",
  TARJETA: "tarjeta",
};

function serializePrestamo(
  prestamo: Prestamo & {
    pagos: (PrestamoPago & { createdBy?: Pick<User, "id" | "name"> | null })[];
    createdBy?: Pick<User, "id" | "name"> | null;
  },
) {
  const amount = Number(prestamo.amount);
  const pagos = prestamo.pagos.map(serializePago);
  const totalPagado = pagos.reduce((sum, p) => sum + p.amount, 0);
  return {
    id: prestamo.id,
    amount,
    lender: prestamo.lender,
    notes: prestamo.notes,
    metodoPago: prestamo.metodoPago,
    createdById: prestamo.createdById,
    createdByName: prestamo.createdBy?.name ?? null,
    createdAt: prestamo.createdAt,
    totalPagado,
    saldo: amount - totalPagado,
    pagos,
  };
}

function serializePago(pago: PrestamoPago & { createdBy?: Pick<User, "id" | "name"> | null }) {
  return {
    id: pago.id,
    amount: Number(pago.amount),
    metodoPago: pago.metodoPago,
    notes: pago.notes,
    prestamoId: pago.prestamoId,
    createdById: pago.createdById,
    createdByName: pago.createdBy?.name ?? null,
    createdAt: pago.createdAt,
  };
}

const prestamoInclude = {
  pagos: { include: { createdBy: { select: { id: true, name: true } } } },
  createdBy: { select: { id: true, name: true } },
} as const;

export async function listPrestamos() {
  const prestamos = await prisma.prestamo.findMany({
    orderBy: { createdAt: "desc" },
    include: prestamoInclude,
  });
  return prestamos.map(serializePrestamo);
}

export async function getPrestamoSaldo(prestamoId: string): Promise<number> {
  const prestamo = await prisma.prestamo.findUnique({ where: { id: prestamoId }, include: { pagos: true } });
  if (!prestamo) {
    throw new HttpError(404, "Prestamo no encontrado");
  }
  return serializePrestamo({ ...prestamo, createdBy: null }).saldo;
}

export interface CreatePrestamoInput {
  amount: number;
  lender: string;
  notes?: string | null;
  metodoPago: MetodoPago;
}

export async function createPrestamo(input: CreatePrestamoInput, createdById: string) {
  if (input.amount <= 0) {
    throw new HttpError(400, "El monto debe ser mayor a cero");
  }

  const prestamo = await prisma.prestamo.create({
    data: {
      amount: input.amount,
      lender: input.lender,
      notes: input.notes ?? null,
      metodoPago: input.metodoPago,
      createdById,
    },
    include: prestamoInclude,
  });

  const serialized = serializePrestamo(prestamo);
  await recordEvento({
    tipo: HistorialTipo.PRESTAMO_REGISTRADO,
    descripcion: `Prestamo recibido de "${input.lender}" - ${METODO_PAGO_LABEL[input.metodoPago]}`,
    monto: serialized.amount,
    userId: createdById,
    prestamoId: serialized.id,
  });

  return serialized;
}

export interface CreatePrestamoPagoInput {
  prestamoId: string;
  amount: number;
  metodoPago: MetodoPago;
  notes?: string | null;
}

export async function createPrestamoPago(input: CreatePrestamoPagoInput, createdById: string) {
  if (input.amount <= 0) {
    throw new HttpError(400, "El monto debe ser mayor a cero");
  }
  const prestamo = await prisma.prestamo.findUnique({ where: { id: input.prestamoId }, include: { pagos: true } });
  if (!prestamo) {
    throw new HttpError(404, "Prestamo no encontrado");
  }
  const saldo = serializePrestamo({ ...prestamo, createdBy: null }).saldo;
  if (input.amount > saldo) {
    throw new HttpError(
      400,
      saldo > 0
        ? `El pago no puede superar el saldo pendiente (${saldo.toLocaleString("es-CO")})`
        : "Este prestamo no tiene saldo pendiente",
    );
  }

  const pago = await prisma.prestamoPago.create({
    data: {
      prestamoId: input.prestamoId,
      amount: input.amount,
      metodoPago: input.metodoPago,
      notes: input.notes ?? null,
      createdById,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  const serialized = serializePago(pago);
  await recordEvento({
    tipo: HistorialTipo.PRESTAMO_PAGO_REGISTRADO,
    descripcion: `Pago de prestamo a "${prestamo.lender}" - ${METODO_PAGO_LABEL[input.metodoPago]}`,
    monto: serialized.amount,
    userId: createdById,
    prestamoId: prestamo.id,
    prestamoPagoId: serialized.id,
  });

  return serialized;
}
