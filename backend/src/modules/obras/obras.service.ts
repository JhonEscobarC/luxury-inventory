import { Prisma, type Obra, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

function serializeObra(
  obra: Obra & { users?: Pick<User, "id" | "name" | "email">[]; proyecto?: { id: string; name: string } | null },
) {
  return {
    id: obra.id,
    name: obra.name,
    address: obra.address,
    client: obra.client,
    notes: obra.notes,
    precioVenta: obra.precioVenta === null ? null : Number(obra.precioVenta),
    isActive: obra.isActive,
    createdAt: obra.createdAt,
    updatedAt: obra.updatedAt,
    proyectoId: obra.proyectoId,
    proyectoName: obra.proyecto?.name ?? null,
    users: obra.users?.map((u) => ({ id: u.id, name: u.name, email: u.email })) ?? undefined,
  };
}

export interface ListObrasFilters {
  search?: string;
  isActive?: boolean;
  proyectoId?: string | null;
}

export async function listObras(filters: ListObrasFilters) {
  const where: Prisma.ObraWhereInput = {};
  if (filters.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  if (filters.proyectoId !== undefined) {
    where.proyectoId = filters.proyectoId;
  }

  const obras = await prisma.obra.findMany({
    where,
    orderBy: { name: "asc" },
    include: { users: { select: { id: true, name: true, email: true } }, proyecto: { select: { id: true, name: true } } },
  });
  return obras.map(serializeObra);
}

export async function listObrasForUser(userId: string) {
  const obras = await prisma.obra.findMany({
    where: { users: { some: { id: userId } }, isActive: true },
    orderBy: { name: "asc" },
  });
  return obras.map((obra) => serializeObra(obra));
}

export async function getObraById(id: string) {
  const obra = await prisma.obra.findUnique({
    where: { id },
    include: { users: { select: { id: true, name: true, email: true } }, proyecto: { select: { id: true, name: true } } },
  });
  if (!obra) {
    throw new HttpError(404, "Obra no encontrada");
  }
  return serializeObra(obra);
}

export interface ObraInput {
  name: string;
  address?: string | null;
  client?: string | null;
  notes?: string | null;
  precioVenta?: number | null;
  proyectoId?: string | null;
}

export async function createObra(input: ObraInput) {
  if (input.proyectoId) {
    const proyecto = await prisma.proyecto.findUnique({ where: { id: input.proyectoId } });
    if (!proyecto) {
      throw new HttpError(404, "Proyecto no encontrado");
    }
  }
  const obra = await prisma.obra.create({
    data: {
      name: input.name,
      address: input.address ?? null,
      client: input.client ?? null,
      notes: input.notes ?? null,
      precioVenta: input.precioVenta ?? null,
      proyectoId: input.proyectoId ?? null,
    },
    include: { proyecto: { select: { id: true, name: true } } },
  });
  return serializeObra(obra);
}

export async function updateObra(id: string, input: Partial<ObraInput>) {
  const existing = await prisma.obra.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Obra no encontrada");
  }
  if (input.proyectoId) {
    const proyecto = await prisma.proyecto.findUnique({ where: { id: input.proyectoId } });
    if (!proyecto) {
      throw new HttpError(404, "Proyecto no encontrado");
    }
  }
  // No dejar que el precio de venta baje por debajo de lo ya abonado: eso dejaria un
  // saldo pendiente negativo.
  if (input.precioVenta !== undefined && input.precioVenta !== null) {
    const abonoSum = await prisma.abonoCliente.aggregate({ where: { obraId: id }, _sum: { amount: true } });
    const totalAbonado = Number(abonoSum._sum.amount ?? 0);
    if (input.precioVenta < totalAbonado) {
      const currencyFormatter = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      throw new HttpError(
        400,
        `El precio de venta no puede ser menor a lo ya abonado (${currencyFormatter.format(totalAbonado)})`,
      );
    }
  }
  const obra = await prisma.obra.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.client !== undefined && { client: input.client }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.precioVenta !== undefined && { precioVenta: input.precioVenta }),
      ...(input.proyectoId !== undefined && { proyectoId: input.proyectoId }),
    },
    include: { proyecto: { select: { id: true, name: true } } },
  });
  return serializeObra(obra);
}

// Elimina la obra y todo lo que cuelga de ella (inventario, pedidos, abonos de cliente,
// asignaciones a contratistas). El Historial conserva sus registros como texto.
export async function deleteObra(id: string) {
  const existing = await prisma.obra.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Obra no encontrada");
  }
  await prisma.$transaction(async (tx) => {
    await tx.product.deleteMany({ where: { obraId: id } });
    await tx.abonoCliente.deleteMany({ where: { obraId: id } });
    await tx.contratistaAsignacion.deleteMany({ where: { obraId: id } });
    await tx.order.deleteMany({ where: { obraId: id } });
    await tx.obra.delete({ where: { id } });
  });
}

export async function setObraUsers(id: string, userIds: string[]) {
  const existing = await prisma.obra.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Obra no encontrada");
  }
  const obra = await prisma.obra.update({
    where: { id },
    data: { users: { set: userIds.map((userId) => ({ id: userId })) } },
    include: { users: { select: { id: true, name: true, email: true } } },
  });
  return serializeObra(obra);
}
