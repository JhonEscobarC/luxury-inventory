import {
  HistorialTipo,
  Prisma,
  ProductoHistorialTipo,
  type MaterialUso,
  type Obra,
  type Product,
  type User,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordProductoHistorial } from "../products/productHistorial.service";
import { recordEvento } from "../historial/historial.service";

function serializeMaterialUso(
  uso: MaterialUso & { product: Pick<Product, "id" | "name" | "unit">; obra: Pick<Obra, "id" | "name">; user: Pick<User, "id" | "name"> | null },
) {
  return {
    id: uso.id,
    quantity: Number(uso.quantity),
    reason: uso.reason,
    createdAt: uso.createdAt,
    productId: uso.productId,
    productName: uso.product.name,
    unit: uso.product.unit,
    obraId: uso.obraId,
    obraName: uso.obra.name,
    userId: uso.userId,
    userName: uso.user?.name ?? null,
  };
}

const materialUsoInclude = {
  product: { select: { id: true, name: true, unit: true } },
  obra: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.MaterialUsoInclude;

export interface CreateMaterialUsoInput {
  productId: string;
  quantity: number;
  reason: string;
  userId: string;
}

export async function createMaterialUso(input: CreateMaterialUsoInput) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) {
    throw new HttpError(404, "Producto no encontrado");
  }
  if (!product.obraId) {
    throw new HttpError(400, "Este producto es stock general y no esta asignado a una obra");
  }

  const hasAccess = await prisma.obra.findFirst({
    where: { id: product.obraId, users: { some: { id: input.userId } } },
  });
  if (!hasAccess) {
    throw new HttpError(403, "No tienes acceso al inventario de esta obra");
  }

  if (input.quantity <= 0) {
    throw new HttpError(400, "La cantidad debe ser mayor a cero");
  }
  if (input.quantity > Number(product.quantity)) {
    throw new HttpError(400, "La cantidad supera el stock disponible");
  }

  const uso = await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { quantity: { decrement: input.quantity } },
    });
    await recordProductoHistorial(tx, {
      productId: product.id,
      tipo: ProductoHistorialTipo.USO,
      descripcion: `Uso: ${input.reason}`,
      cantidad: -input.quantity,
      cantidadResultante: updatedProduct.quantity,
      userId: input.userId,
    });
    return tx.materialUso.create({
      data: {
        productId: product.id,
        obraId: product.obraId!,
        userId: input.userId,
        quantity: input.quantity,
        reason: input.reason,
      },
      include: materialUsoInclude,
    });
  });

  const serialized = serializeMaterialUso(uso);
  await recordEvento({
    tipo: HistorialTipo.MATERIAL_USADO,
    descripcion: `Se uso "${serialized.quantity} ${serialized.unit}" de "${serialized.productName}" en "${serialized.obraName}": ${serialized.reason}`,
    userId: input.userId,
    obraId: serialized.obraId,
  });

  return serialized;
}

export interface ListMaterialUsosFilters {
  obraId?: string;
  productId?: string;
  restrictToObraIds?: string[];
}

export async function listMaterialUsos(filters: ListMaterialUsosFilters) {
  const where: Prisma.MaterialUsoWhereInput = {};
  if (filters.productId) where.productId = filters.productId;

  if (filters.restrictToObraIds) {
    if (filters.obraId && filters.restrictToObraIds.includes(filters.obraId)) {
      where.obraId = filters.obraId;
    } else {
      where.obraId = { in: filters.restrictToObraIds };
    }
  } else if (filters.obraId) {
    where.obraId = filters.obraId;
  }

  const usos = await prisma.materialUso.findMany({
    where,
    include: materialUsoInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return usos.map(serializeMaterialUso);
}
