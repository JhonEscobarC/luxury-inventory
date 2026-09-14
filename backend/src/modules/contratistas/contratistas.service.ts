import { Prisma, type Contratista } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

function serializeContratista(contratista: Contratista) {
  return {
    id: contratista.id,
    name: contratista.name,
    oficio: contratista.oficio,
    phone: contratista.phone,
    email: contratista.email,
    notes: contratista.notes,
    isActive: contratista.isActive,
    createdAt: contratista.createdAt,
    updatedAt: contratista.updatedAt,
  };
}

export interface ListContratistasFilters {
  search?: string;
  isActive?: boolean;
}

export async function listContratistas(filters: ListContratistasFilters) {
  const where: Prisma.ContratistaWhereInput = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { oficio: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const contratistas = await prisma.contratista.findMany({ where, orderBy: { name: "asc" } });
  return contratistas.map(serializeContratista);
}

export async function getContratistaById(id: string) {
  const contratista = await prisma.contratista.findUnique({ where: { id } });
  if (!contratista) {
    throw new HttpError(404, "Contratista no encontrado");
  }
  return serializeContratista(contratista);
}

export interface ContratistaInput {
  name: string;
  oficio?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export async function createContratista(input: ContratistaInput) {
  const contratista = await prisma.contratista.create({
    data: {
      name: input.name,
      oficio: input.oficio ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
    },
  });
  return serializeContratista(contratista);
}

export async function updateContratista(id: string, input: Partial<ContratistaInput>) {
  const existing = await prisma.contratista.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Contratista no encontrado");
  }
  const contratista = await prisma.contratista.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.oficio !== undefined && { oficio: input.oficio }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return serializeContratista(contratista);
}

export async function setContratistaActive(id: string, isActive: boolean) {
  const existing = await prisma.contratista.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Contratista no encontrado");
  }
  const contratista = await prisma.contratista.update({ where: { id }, data: { isActive } });
  return serializeContratista(contratista);
}
