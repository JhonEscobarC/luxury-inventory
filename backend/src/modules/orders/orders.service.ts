import {
  Prisma,
  OrderStatus,
  HistorialTipo,
  type Order,
  type OrderItem,
  type Obra,
  type Proveedor,
  type Product,
  type User,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordEvento } from "../historial/historial.service";
import { endOfDay } from "../../utils/dates";

export interface OrderItemInput {
  description: string;
  quantity: number;
  unit: string;
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
  productId?: string | null;
}

export interface AssignOrderInput {
  proveedorId: string;
  notes?: string | null;
  items: AssignmentItemInput[];
}

type OrderItemWithProduct = OrderItem & { product: Product | null };

type OrderWithRelations = Order & {
  items: OrderItemWithProduct[];
  obra: Obra;
  proveedor: Proveedor | null;
  createdBy: User;
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
      productId: item.productId,
      productName: item.product?.name ?? null,
    };
  });

  const total = items.every((item) => item.subtotal !== null)
    ? items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0)
    : null;

  return {
    id: order.id,
    status: order.status,
    notes: order.notes,
    obraId: order.obraId,
    obraName: order.obra.name,
    proveedorId: order.proveedorId,
    proveedorName: order.proveedor?.name ?? null,
    createdById: order.createdById,
    createdByName: order.createdBy.name,
    assignedByName: order.assignedBy?.name ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items,
    total,
  };
}

const orderInclude = {
  items: { include: { product: true } },
  obra: true,
  proveedor: true,
  createdBy: true,
  assignedBy: true,
} satisfies Prisma.OrderInclude;

export interface ListOrdersFilters {
  status?: OrderStatus;
  obraId?: string;
  proveedorId?: string;
  from?: Date;
  to?: Date;
  restrictToObraIds?: string[];
}

export async function listOrders(filters: ListOrdersFilters) {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.obraId) where.obraId = filters.obraId;
  if (filters.proveedorId) where.proveedorId = filters.proveedorId;
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
        })),
      },
    },
    include: orderInclude,
  });

  const serialized = serializeOrder(order);
  await recordEvento({
    tipo: HistorialTipo.PEDIDO_CREADO,
    descripcion: `Pedido creado para "${serialized.obraName}"`,
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
    throw new HttpError(400, "Solo se pueden editar pedidos en estado pendiente");
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
    throw new HttpError(400, "Solo se puede asignar proveedor a un pedido pendiente");
  }

  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new HttpError(400, `La cantidad debe ser mayor a cero (${item.description})`);
    }
    if (item.unitPrice < 0) {
      throw new HttpError(400, "El precio no puede ser negativo");
    }
  }

  if (input.items.some((item) => item.productId)) {
    const productIds = input.items.map((item) => item.productId).filter((v): v is string => Boolean(v));
    const foundCount = await prisma.product.count({ where: { id: { in: productIds } } });
    if (foundCount !== new Set(productIds).size) {
      throw new HttpError(400, "Uno de los productos de inventario vinculados no existe");
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    return tx.order.update({
      where: { id },
      data: {
        proveedorId: input.proveedorId,
        assignedById,
        status: OrderStatus.CONFIRMADO,
        ...(input.notes !== undefined && { notes: input.notes || null }),
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            productId: item.productId ?? null,
          })),
        },
      },
      include: orderInclude,
    });
  });

  const serialized = serializeOrder(order);
  await recordEvento({
    tipo: HistorialTipo.PEDIDO_CONFIRMADO,
    descripcion: `Pedido de "${serialized.obraName}" confirmado con proveedor "${serialized.proveedorName}"`,
    monto: serialized.total,
    userId: assignedById,
    obraId: serialized.obraId,
    proveedorId: serialized.proveedorId,
    orderId: serialized.id,
  });

  return serialized;
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
    const linkedItems = existing.items.filter((item) => item.productId);

    const order = await prisma.$transaction(async (tx) => {
      for (const item of linkedItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId! } });
        if (!product) continue;
        const available = Number(product.quantity);
        const requested = Number(item.quantity);
        if (available < requested) {
          throw new HttpError(
            400,
            `Stock insuficiente para despachar "${product.name}" (disponible: ${available}, requerido: ${requested})`,
          );
        }
      }

      for (const item of linkedItems) {
        await tx.product.update({
          where: { id: item.productId! },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: nextStatus },
        include: orderInclude,
      });
    });

    const serialized = serializeOrder(order);
    await recordEvento({
      tipo: HistorialTipo.PEDIDO_DESPACHADO,
      descripcion: `Pedido de "${serialized.obraName}" despachado`,
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
