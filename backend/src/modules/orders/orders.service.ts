import { Prisma, OrderStatus, OrderSource, type Order, type OrderItem, type Product, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

export interface OrdersReportFilters {
  status?: OrderStatus;
  from?: Date;
  to?: Date;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  items: OrderItemInput[];
  source?: OrderSource;
}

export type UpdateOrderInput = Partial<CreateOrderInput>;

type OrderWithRelations = Order & {
  items: (OrderItem & { product: Product })[];
  createdBy: User | null;
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE: [OrderStatus.CONFIRMADO, OrderStatus.CANCELADO],
  CONFIRMADO: [OrderStatus.DESPACHADO, OrderStatus.CANCELADO],
  DESPACHADO: [],
  CANCELADO: [],
};

function serializeOrder(order: OrderWithRelations) {
  const items = order.items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      unit: item.product.unit,
      quantity,
      unitPrice,
      subtotal: quantity * unitPrice,
    };
  });

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: order.id,
    status: order.status,
    source: order.source,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    notes: order.notes,
    createdByName: order.createdBy?.name ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items,
    total,
  };
}

const orderInclude = {
  items: { include: { product: true } },
  createdBy: true,
} satisfies Prisma.OrderInclude;

export async function listOrdersForReport(filters: OrdersReportFilters) {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from && { gte: filters.from }),
      ...(filters.to && { lte: filters.to }),
    };
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

async function buildItemsData(items: OrderItemInput[]) {
  if (items.length === 0) {
    throw new HttpError(400, "El pedido debe tener al menos un producto");
  }

  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw new HttpError(400, `Producto no encontrado: ${item.productId}`);
    }
    if (item.quantity <= 0) {
      throw new HttpError(400, `La cantidad debe ser mayor a cero (${product.name})`);
    }
    return {
      productId: product.id,
      quantity: item.quantity,
      unitPrice: product.price,
    };
  });
}

export async function createOrder(input: CreateOrderInput, createdById: string) {
  const itemsData = await buildItemsData(input.items);

  const order = await prisma.order.create({
    data: {
      customerName: input.customerName || null,
      customerPhone: input.customerPhone || null,
      notes: input.notes || null,
      source: input.source ?? OrderSource.MANUAL,
      createdById,
      items: { create: itemsData },
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

  const itemsData = input.items ? await buildItemsData(input.items) : undefined;

  const order = await prisma.$transaction(async (tx) => {
    if (itemsData) {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
    }
    return tx.order.update({
      where: { id },
      data: {
        ...(input.customerName !== undefined && { customerName: input.customerName || null }),
        ...(input.customerPhone !== undefined && { customerPhone: input.customerPhone || null }),
        ...(input.notes !== undefined && { notes: input.notes || null }),
        ...(itemsData && { items: { create: itemsData } }),
      },
      include: orderInclude,
    });
  });

  return serializeOrder(order);
}

export async function updateOrderStatus(id: string, nextStatus: OrderStatus) {
  const existing = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!existing) {
    throw new HttpError(404, "Pedido no encontrado");
  }

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(
      400,
      `No se puede cambiar de "${existing.status}" a "${nextStatus}"`,
    );
  }

  if (nextStatus === OrderStatus.DESPACHADO) {
    const order = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
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

      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: nextStatus },
        include: orderInclude,
      });
    });

    return serializeOrder(order);
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: nextStatus },
    include: orderInclude,
  });

  return serializeOrder(order);
}
