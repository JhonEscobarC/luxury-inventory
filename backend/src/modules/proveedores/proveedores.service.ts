import { Prisma, type Proveedor } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

function serializeProveedor(proveedor: Proveedor) {
  return {
    id: proveedor.id,
    name: proveedor.name,
    contactName: proveedor.contactName,
    phone: proveedor.phone,
    email: proveedor.email,
    address: proveedor.address,
    category: proveedor.category,
    notes: proveedor.notes,
    isActive: proveedor.isActive,
    createdAt: proveedor.createdAt,
    updatedAt: proveedor.updatedAt,
  };
}

export interface ListProveedoresFilters {
  search?: string;
  isActive?: boolean;
}

export async function listProveedores(filters: ListProveedoresFilters) {
  const where: Prisma.ProveedorWhereInput = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { category: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const proveedores = await prisma.proveedor.findMany({ where, orderBy: { name: "asc" } });
  return proveedores.map(serializeProveedor);
}

export async function getProveedorById(id: string) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id } });
  if (!proveedor) {
    throw new HttpError(404, "Proveedor no encontrado");
  }
  return serializeProveedor(proveedor);
}

export interface ProveedorInput {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  category?: string | null;
  notes?: string | null;
}

export async function createProveedor(input: ProveedorInput) {
  const proveedor = await prisma.proveedor.create({
    data: {
      name: input.name,
      contactName: input.contactName ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      category: input.category ?? null,
      notes: input.notes ?? null,
    },
  });
  return serializeProveedor(proveedor);
}

export async function updateProveedor(id: string, input: Partial<ProveedorInput>) {
  const existing = await prisma.proveedor.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Proveedor no encontrado");
  }
  const proveedor = await prisma.proveedor.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return serializeProveedor(proveedor);
}

export async function setProveedorActive(id: string, isActive: boolean) {
  const existing = await prisma.proveedor.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Proveedor no encontrado");
  }
  const proveedor = await prisma.proveedor.update({ where: { id }, data: { isActive } });
  return serializeProveedor(proveedor);
}
