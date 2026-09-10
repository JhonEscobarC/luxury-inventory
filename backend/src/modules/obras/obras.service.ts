import { Prisma, type Obra, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

function serializeObra(obra: Obra & { users?: Pick<User, "id" | "name" | "email">[] }) {
  return {
    id: obra.id,
    name: obra.name,
    address: obra.address,
    client: obra.client,
    notes: obra.notes,
    isActive: obra.isActive,
    createdAt: obra.createdAt,
    updatedAt: obra.updatedAt,
    users: obra.users?.map((u) => ({ id: u.id, name: u.name, email: u.email })) ?? undefined,
  };
}

export interface ListObrasFilters {
  search?: string;
  isActive?: boolean;
}

export async function listObras(filters: ListObrasFilters) {
  const where: Prisma.ObraWhereInput = {};
  if (filters.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const obras = await prisma.obra.findMany({
    where,
    orderBy: { name: "asc" },
    include: { users: { select: { id: true, name: true, email: true } } },
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
    include: { users: { select: { id: true, name: true, email: true } } },
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
}

export async function createObra(input: ObraInput) {
  const obra = await prisma.obra.create({
    data: {
      name: input.name,
      address: input.address ?? null,
      client: input.client ?? null,
      notes: input.notes ?? null,
    },
  });
  return serializeObra(obra);
}

export async function updateObra(id: string, input: Partial<ObraInput>) {
  const existing = await prisma.obra.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Obra no encontrada");
  }
  const obra = await prisma.obra.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.client !== undefined && { client: input.client }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return serializeObra(obra);
}

export async function setObraActive(id: string, isActive: boolean) {
  const existing = await prisma.obra.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Obra no encontrada");
  }
  const obra = await prisma.obra.update({ where: { id }, data: { isActive } });
  return serializeObra(obra);
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
