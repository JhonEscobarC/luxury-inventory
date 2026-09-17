import {
  Prisma,
  OrderStatus,
  FormaPago,
  HistorialTipo,
  type Order,
  type OrderItem,
  type Obra,
  type Proveedor,
  type Product,
  type Categoria,
  type User,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordEvento } from "../historial/historial.service";
import { endOfDay } from "../../utils/dates";

// Los estados internos (PENDIENTE/CONFIRMADO/DESPACHADO) no cambiaron de nombre para
// evitar una migracion de datos riesgosa; en toda la interfaz se muestran como
// Solicitud / Compra / Recibido.

export interface OrderItemInput {
  description: string;
  quantity: number;
  unit: string;
  categoriaId?: string | null;
}

export interface CreateOrderInput {
  obraId: string;
  notes?: string | null;
  items: OrderItemInput[];
}

export type UpdateOrderInput = Partial<Pick<CreateOrderInput, "notes" | "items">>;

export interface AssignmentItemInput {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  categoriaId?: string | null;
  proveedorId?: string | null;
}

export interface AssignOrderInput {
  // null/undefined = el pedido usa un proveedor distinto por material (cada item trae el suyo).
  proveedorId?: string | null;
  notes?: string | null;
  formaPago: FormaPago;
  items: AssignmentItemInput[];
}

type OrderItemWithRelations = OrderItem & {
  product: Product | null;
  categoria: Categoria | null;
  proveedor: Proveedor | null;
};

type OrderWithRelations = Order & {
  items: OrderItemWithRelations[];
  obra: Obra;
  proveedor: Proveedor | null;
  createdBy: User | null;
  assignedBy: User | null;
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE: [OrderStatus.CANCELADO],
  CONFIRMADO: [OrderStatus.DESPACHADO, OrderStatus.CANCELADO],
  DESPACHADO: [],
  CANCELADO: [],
};

function serializeOrder(order: OrderWithRelations) {
  const items = order.items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = item.unitPrice === null ? null : Number(item.unitPrice);
    return {
      id: item.id,
      description: item.description,
      quantity,
      unit: item.unit,
      unitPrice,
      subtotal: unitPrice === null ? null : quantity * unitPrice,
      categoriaId: item.categoriaId,
      categoriaName: item.categoria?.name ?? null,
      productId: item.productId,
      productName: item.product?.name ?? null,
      proveedorId: item.proveedorId,
      proveedorName: item.proveedor?.name ?? null,
    };
  });

  const total = items.every((item) => item.subtotal !== null)
    ? items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0)
    : null;

  // Con proveedor unico, todos los items comparten order.proveedorId (item.proveedorId
  // queda null). Con proveedor por item, order.proveedorId queda null y cada item trae
  // el suyo; si son todos iguales lo mostramos igual, si no, hayMultiplesProveedores.
  const itemProveedorIds = new Set(items.map((item) => item.proveedorId).filter((id): id is string => !!id));
  const hasMultipleProveedores = !order.proveedorId && itemProveedorIds.size > 1;

  return {
    id: order.id,
    status: order.status,
    notes: order.notes,
    formaPago: order.formaPago,
    obraId: order.obraId,
    obraName: order.obra.name,
    proveedorId: order.proveedorId,
    proveedorName: order.proveedor?.name ?? null,
    hasMultipleProveedores,
    createdById: order.createdById,
    createdByName: order.createdBy?.name ?? null,
    assignedByName: order.assignedBy?.name ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items,
    total,
  };
}

const orderInclude = {
  items: { include: { product: true, categoria: true, proveedor: true } },
  obra: true,
  proveedor: true,
  createdBy: true,
  assignedBy: true,
} satisfies Prisma.OrderInclude;

export interface ListOrdersFilters {
  status?: OrderStatus;
  obraId?: string;
  proveedorId?: string;
  categoriaId?: string;
  from?: Date;
  to?: Date;
  restrictToObraIds?: string[];
}

export async function listOrders(filters: ListOrdersFilters) {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.obraId) where.obraId = filters.obraId;
  if (filters.proveedorId) where.proveedorId = filters.proveedorId;
  // Un pedido "coincide" con la categoria si al menos uno de sus materiales la tiene.
  if (filters.categoriaId) where.items = { some: { categoriaId: filters.categoriaId } };
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from && { gte: filters.from }),
      ...(filters.to && { lte: endOfDay(filters.to) }),
    };
  }
  if (filters.restrictToObraIds) {
    where.obraId = filters.obraId ? filters.obraId : { in: filters.restrictToObraIds };
    if (filters.obraId && !filters.restrictToObraIds.includes(filters.obraId)) {
      // El usuario pidio una obra a la que no tiene acceso: no debe ver nada.
      where.id = "__none__";
    }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });

  return orders.map(serializeOrder);
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) {
    throw new HttpError(404, "Pedido no encontrado");
  }
  return serializeOrder(order);
}

function validateItems(items: OrderItemInput[]) {
  if (items.length === 0) {
    throw new HttpError(400, "El pedido debe tener al menos un material");
  }
  for (const item of items) {
    if (item.quantity <= 0) {
      throw new HttpError(400, `La cantidad debe ser mayor a cero (${item.description})`);
    }
  }
}

export async function createOrder(input: CreateOrderInput, createdById: string) {
  validateItems(input.items);

  const order = await prisma.order.create({
    data: {
      obraId: input.obraId,
      notes: input.notes || null,
      createdById,
      items: {
        create: input.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          categoriaId: item.categoriaId ?? null,
        })),
      },
    },
    include: orderInclude,
  });

  const serialized = serializeOrder(order);
  await recordEvento({
    tipo: HistorialTipo.PEDIDO_CREADO,
    descripcion: `Solicitud creada para "${serialized.obraName}"`,
    userId: createdById,
    obraId: serialized.obraId,
    orderId: serialized.id,
  });

  return serialized;
}

export async function updateOrder(id: string, input: UpdateOrderInput) {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Pedido no encontrado");
  }
  if (existing.status !== OrderStatus.PENDIENTE) {
    throw new HttpError(400, "Solo se pueden editar solicitudes en estado pendiente");
  }

  if (input.items) {
    validateItems(input.items);
  }

  const order = await prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
    }
    return tx.order.update({
      where: { id },
      data: {
        ...(input.notes !== undefined && { notes: input.notes || null }),
        ...(input.items && {
          items: {
            create: input.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              categoriaId: item.categoriaId ?? null,
            })),
          },
        }),
      },
      include: orderInclude,
    });
  });

  return serializeOrder(order);
}

export async function assignOrder(id: string, input: AssignOrderInput, assignedById: string) {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Pedido no encontrado");
  }
  if (existing.status !== OrderStatus.PENDIENTE) {
    throw new HttpError(400, "Solo se puede pasar a compra una solicitud pendiente");
  }

  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new HttpError(400, `La cantidad debe ser mayor a cero (${item.description})`);
    }
    if (item.unitPrice < 0) {
      throw new HttpError(400, "El precio no puede ser negativo");
    }
  }

  // Dos modos, mutuamente excluyentes: un solo proveedor para todo el pedido
  // (input.proveedorId) o uno distinto por material (cada item trae el suyo).
  const usesSingleProveedor = !!input.proveedorId;
  if (!usesSingleProveedor) {
    const missing = input.items.find((item) => !item.proveedorId);
    if (missing) {
      throw new HttpError(400, `Selecciona un proveedor para "${missing.description}"`);
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    return tx.order.update({
      where: { id },
      data: {
        proveedorId: usesSingleProveedor ? input.proveedorId : null,
        assignedById,
        status: OrderStatus.CONFIRMADO,
        formaPago: input.formaPago,
        ...(input.notes !== undefined && { notes: input.notes || null }),
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            categoriaId: item.categoriaId ?? null,
            proveedorId: usesSingleProveedor ? null : item.proveedorId,
          })),
        },
      },
      include: orderInclude,
    });
  });

  const serialized = serializeOrder(order);
  const proveedorLabel = serialized.proveedorName ?? "varios proveedores (uno por material)";
  await recordEvento({
    tipo: HistorialTipo.PEDIDO_CONFIRMADO,
    descripcion: `Pedido de "${serialized.obraName}" pasado a compra con proveedor "${proveedorLabel}" (${
      input.formaPago === FormaPago.CONTADO ? "contado" : "credito"
    })`,
    monto: serialized.total,
    userId: assignedById,
    obraId: serialized.obraId,
    proveedorId: serialized.proveedorId,
    orderId: serialized.id,
  });

  return serialized;
}

// Al recibir un pedido, cada material con categoria asignada se suma automaticamente al
// inventario de la obra del pedido: si ya existe un producto de esa obra con la misma
// categoria y nombre se le incrementa la cantidad, si no existe se crea ligado a esa obra.
// Los materiales sin categoria no se inventarian.
async function receiveItemsIntoInventory(
  tx: Prisma.TransactionClient,
  obraId: string,
  items: { id: string; description: string; quantity: Prisma.Decimal; unit: string; unitPrice: Prisma.Decimal | null; categoriaId: string | null }[],
) {
  for (const item of items) {
    if (!item.categoriaId) continue;

    const existingProduct = await tx.product.findFirst({
      where: { obraId, categoriaId: item.categoriaId, name: { equals: item.description, mode: "insensitive" } },
    });

    if (existingProduct) {
      await tx.product.update({
        where: { id: existingProduct.id },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.orderItem.update({ where: { id: item.id }, data: { productId: existingProduct.id } });
    } else {
      const newProduct = await tx.product.create({
        data: {
          name: item.description,
          categoriaId: item.categoriaId,
          obraId,
          quantity: item.quantity,
          unit: item.unit,
          price: item.unitPrice ?? 0,
        },
      });
      await tx.orderItem.update({ where: { id: item.id }, data: { productId: newProduct.id } });
    }
  }
}

export async function updateOrderStatus(id: string, nextStatus: OrderStatus, userId?: string) {
  const existing = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!existing) {
    throw new HttpError(404, "Pedido no encontrado");
  }

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(400, `No se puede cambiar de "${existing.status}" a "${nextStatus}"`);
  }

  if (nextStatus === OrderStatus.DESPACHADO) {
    const order = await prisma.$transaction(async (tx) => {
      await receiveItemsIntoInventory(tx, existing.obraId, existing.items);
      return tx.order.update({
        where: { id },
        data: { status: nextStatus },
        include: orderInclude,
      });
    });

    const serialized = serializeOrder(order);
    await recordEvento({
      tipo: HistorialTipo.PEDIDO_DESPACHADO,
      descripcion: `Pedido de "${serialized.obraName}" recibido (materiales almacenados en inventario)`,
      monto: serialized.total,
      userId,
      obraId: serialized.obraId,
      proveedorId: serialized.proveedorId,
      orderId: serialized.id,
    });

    return serialized;
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: nextStatus },
    include: orderInclude,
  });

  const serialized = serializeOrder(order);
  if (nextStatus === OrderStatus.CANCELADO) {
    await recordEvento({
      tipo: HistorialTipo.PEDIDO_CANCELADO,
      descripcion: `Pedido de "${serialized.obraName}" cancelado`,
      userId,
      obraId: serialized.obraId,
      proveedorId: serialized.proveedorId,
      orderId: serialized.id,
    });
  }

  return serialized;
}
