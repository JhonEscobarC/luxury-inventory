import { Prisma, type Proveedor, type Categoria, type Obra, type Proyecto } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

export interface ListProductsParams {
  search?: string;
  categoriaId?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
  /** Filtro explicito por obra (incluye "sin obra" cuando se pasa null). */
  obraId?: string | null;
  /** Filtro por proyecto (agrega todas las obras de ese proyecto); "sin obra" queda fuera. Ignorado si se pasa obraId. */
  proyectoId?: string | null;
  /** Restringe la consulta a estas obras (usado para el rol OBRA, ignora obraId si no esta incluido). */
  restrictToObraIds?: string[];
}

export interface ProductInput {
  name: string;
  categoriaId?: string | null;
  obraId?: string | null;
  quantity: number;
  unit: string;
  price: number;
  proveedorId?: string | null;
  minStock: number;
}

function serializeProduct(product: {
  id: string;
  name: string;
  quantity: Prisma.Decimal;
  unit: string;
  price: Prisma.Decimal;
  proveedorId: string | null;
  proveedor?: Proveedor | null;
  categoriaId: string | null;
  categoria?: Categoria | null;
  obraId: string | null;
  obra?: (Obra & { proyecto?: Proyecto | null }) | null;
  minStock: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}) {
  const quantity = Number(product.quantity);
  const minStock = Number(product.minStock);
  return {
    id: product.id,
    name: product.name,
    categoriaId: product.categoriaId,
    categoriaName: product.categoria?.name ?? null,
    obraId: product.obraId,
    obraName: product.obra?.name ?? null,
    proyectoId: product.obra?.proyectoId ?? null,
    proyectoName: product.obra?.proyecto?.name ?? null,
    quantity,
    unit: product.unit,
    price: Number(product.price),
    proveedorId: product.proveedorId,
    proveedorName: product.proveedor?.name ?? null,
    minStock,
    isLowStock: quantity <= minStock,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

const productInclude = {
  proveedor: true,
  categoria: true,
  obra: { include: { proyecto: true } },
} satisfies Prisma.ProductInclude;

function buildWhere(params: ListProductsParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { proveedor: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  if (params.categoriaId) {
    where.categoriaId = params.categoriaId;
  }

  if (params.restrictToObraIds) {
    if (params.obraId && params.restrictToObraIds.includes(params.obraId)) {
      where.obraId = params.obraId;
    } else {
      where.obraId = { in: params.restrictToObraIds };
    }
  } else if (params.obraId !== undefined) {
    where.obraId = params.obraId;
  } else if (params.proyectoId !== undefined) {
    where.obra = { proyectoId: params.proyectoId === "none" ? null : params.proyectoId };
  }

  return where;
}

export async function listProducts(params: ListProductsParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;

  const where = buildWhere(params);

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: "asc" },
      skip: params.lowStock ? undefined : (page - 1) * pageSize,
      take: params.lowStock ? undefined : pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  let items = rows.map(serializeProduct);

  if (params.lowStock) {
    items = items.filter((item) => item.isLowStock);
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);
    return { items: paged, total: items.length, page, pageSize };
  }

  return { items, total, page, pageSize };
}

export async function listAllProducts(params: Omit<ListProductsParams, "page" | "pageSize">) {
  const where = buildWhere(params);

  const rows = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ name: "asc" }],
  });

  let items = rows.map(serializeProduct);

  if (params.lowStock) {
    items = items.filter((item) => item.isLowStock);
  }

  return items;
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) {
    throw new HttpError(404, "Producto no encontrado");
  }
  return serializeProduct(product);
}

export async function createProduct(input: ProductInput) {
  const product = await prisma.product.create({
    data: {
      name: input.name,
      categoriaId: input.categoriaId ?? null,
      obraId: input.obraId ?? null,
      quantity: input.quantity,
      unit: input.unit,
      price: input.price,
      proveedorId: input.proveedorId ?? null,
      minStock: input.minStock,
    },
    include: productInclude,
  });
  return serializeProduct(product);
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  await getProductById(id);

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.categoriaId !== undefined && { categoriaId: input.categoriaId }),
      ...(input.obraId !== undefined && { obraId: input.obraId }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.proveedorId !== undefined && { proveedorId: input.proveedorId }),
      ...(input.minStock !== undefined && { minStock: input.minStock }),
    },
    include: productInclude,
  });
  return serializeProduct(product);
}

export async function deleteProduct(id: string) {
  await getProductById(id);
  await prisma.product.delete({ where: { id } });
}

export async function getLowStockCount(): Promise<number> {
  const rows = await prisma.product.findMany({
    select: { quantity: true, minStock: true },
  });
  return rows.filter((row) => Number(row.quantity) <= Number(row.minStock)).length;
}

export async function getObraIdsForUser(userId: string): Promise<string[]> {
  const obras = await prisma.obra.findMany({ where: { users: { some: { id: userId } } }, select: { id: true } });
  return obras.map((obra) => obra.id);
}
