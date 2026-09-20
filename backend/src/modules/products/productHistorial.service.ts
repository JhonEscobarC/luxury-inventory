import { Prisma, ProductoHistorialTipo } from "@prisma/client";
import { prisma } from "../../lib/prisma";

interface RecordProductoHistorialInput {
  productId: string;
  tipo: ProductoHistorialTipo;
  descripcion: string;
  cantidad?: number | Prisma.Decimal | null;
  cantidadResultante?: number | Prisma.Decimal | null;
  userId?: string | null;
}

// Acepta el cliente normal o el de una transaccion para registrar dentro de la misma
// operacion que modifica el producto.
export async function recordProductoHistorial(
  db: Prisma.TransactionClient,
  input: RecordProductoHistorialInput,
) {
  const user = input.userId
    ? await db.user.findUnique({ where: { id: input.userId }, select: { name: true } })
    : null;
  await db.productoHistorial.create({
    data: {
      productId: input.productId,
      tipo: input.tipo,
      descripcion: input.descripcion,
      cantidad: input.cantidad ?? null,
      cantidadResultante: input.cantidadResultante ?? null,
      userName: user?.name ?? null,
    },
  });
}

export async function listProductoHistorial(productId: string) {
  const items = await prisma.productoHistorial.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return items.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    descripcion: item.descripcion,
    cantidad: item.cantidad === null ? null : Number(item.cantidad),
    cantidadResultante: item.cantidadResultante === null ? null : Number(item.cantidadResultante),
    userName: item.userName,
    createdAt: item.createdAt,
  }));
}
