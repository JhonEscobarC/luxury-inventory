import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

export interface ListProductsParams {
  search?: string;
  category?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProductInput {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  supplier?: string | null;
  minStock: number;
}

function serializeProduct(product: {
  id: string;
  name: string;
  category: string;
  quantity: Prisma.Decimal;
  unit: string;
  price: Prisma.Decimal;
  supplier: string | null;
  minStock: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}) {
  const quantity = Number(product.quantity);
  const minStock = Number(product.minStock);
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    quantity,
    unit: product.unit,
    price: Number(product.price),
    supplier: product.supplier,
    minStock,
    isLowStock: quantity <= minStock,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function listProducts(params: ListProductsParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;

  const where: Prisma.ProductWhereInput = {};

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { supplier: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    where.category = params.category;
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
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
  const where: Prisma.ProductWhereInput = {};

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { supplier: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    where.category = params.category;
  }

  const rows = await prisma.product.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  let items = rows.map(serializeProduct);

  if (params.lowStock) {
    items = items.filter((item) => item.isLowStock);
  }

  return items;
}

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((row) => row.category);
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new HttpError(404, "Producto no encontrado");
  }
  return serializeProduct(product);
}

export async function createProduct(input: ProductInput) {
  const product = await prisma.product.create({
    data: {
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      price: input.price,
      supplier: input.supplier ?? null,
      minStock: input.minStock,
    },
  });
  return serializeProduct(product);
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  await getProductById(id);

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.supplier !== undefined && { supplier: input.supplier }),
      ...(input.minStock !== undefined && { minStock: input.minStock }),
    },
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
