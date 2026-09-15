import { Prisma, type Categoria } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

function serializeCategoria(categoria: Categoria) {
  return {
    id: categoria.id,
    name: categoria.name,
    isActive: categoria.isActive,
    createdAt: categoria.createdAt,
    updatedAt: categoria.updatedAt,
  };
}

export interface ListCategoriasFilters {
  search?: string;
  isActive?: boolean;
}

export async function listCategorias(filters: ListCategoriasFilters) {
  const where: Prisma.CategoriaWhereInput = {};
  if (filters.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const categorias = await prisma.categoria.findMany({ where, orderBy: { name: "asc" } });
  return categorias.map(serializeCategoria);
}

export interface CategoriaInput {
  name: string;
}

export async function createCategoria(input: CategoriaInput) {
  const existing = await prisma.categoria.findUnique({ where: { name: input.name } });
  if (existing) {
    throw new HttpError(400, "Ya existe una categoria con ese nombre");
  }
  const categoria = await prisma.categoria.create({ data: { name: input.name } });
  return serializeCategoria(categoria);
}

export async function updateCategoria(id: string, input: Partial<CategoriaInput>) {
  const existing = await prisma.categoria.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Categoria no encontrada");
  }
  if (input.name && input.name !== existing.name) {
    const nameTaken = await prisma.categoria.findUnique({ where: { name: input.name } });
    if (nameTaken) {
      throw new HttpError(400, "Ya existe una categoria con ese nombre");
    }
  }
  const categoria = await prisma.categoria.update({
    where: { id },
    data: { ...(input.name !== undefined && { name: input.name }) },
  });
  return serializeCategoria(categoria);
}

export async function setCategoriaActive(id: string, isActive: boolean) {
  const existing = await prisma.categoria.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Categoria no encontrada");
  }
  const categoria = await prisma.categoria.update({ where: { id }, data: { isActive } });
  return serializeCategoria(categoria);
}
