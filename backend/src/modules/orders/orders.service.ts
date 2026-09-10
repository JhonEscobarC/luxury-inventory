import { Prisma, OrderStatus, type Order, type OrderItem, type Obra, type Proveedor, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

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
  itemId: string;
  unitPrice: number;
}

export interface AssignOrderInput {
  proveedorId: string;
  items: AssignmentItemInput[];
}

type OrderWithRelations = Order & {
  items: OrderItem[];
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
  items: true,
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
      ...(filters.to && { lte: filters.to }),
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

  return serializeOrder(order);
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
  const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!existing) {
    throw new HttpError(404, "Pedido no encontrado");
  }
  if (existing.status !== OrderStatus.PENDIENTE) {
    throw new HttpError(400, "Solo se puede asignar proveedor a un pedido pendiente");
  }

  const existingItemIds = new Set(existing.items.map((item) => item.id));
  for (const priced of input.items) {
    if (!existingItemIds.has(priced.itemId)) {
      throw new HttpError(400, `El item ${priced.itemId} no pertenece a este pedido`);
    }
    if (priced.unitPrice < 0) {
      throw new HttpError(400, "El precio no puede ser negativo");
    }
  }
  if (input.items.length !== existing.items.length) {
    throw new HttpError(400, "Debes asignar un precio a cada material del pedido");
  }

  const order = await prisma.$transaction(async (tx) => {
    for (const priced of input.items) {
      await tx.orderItem.update({ where: { id: priced.itemId }, data: { unitPrice: priced.unitPrice } });
    }
    return tx.order.update({
      where: { id },
      data: {
        proveedorId: input.proveedorId,
        assignedById,
        status: OrderStatus.CONFIRMADO,
      },
      include: orderInclude,
    });
  });

  return serializeOrder(order);
}

export async function updateOrderStatus(id: string, nextStatus: OrderStatus) {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Pedido no encontrado");
  }

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(400, `No se puede cambiar de "${existing.status}" a "${nextStatus}"`);
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: nextStatus },
    include: orderInclude,
  });

  return serializeOrder(order);
}
