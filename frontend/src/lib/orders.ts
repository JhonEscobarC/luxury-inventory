import { api } from "./api";
import type { AssignOrderInput, Order, OrderInput, OrderStatus } from "../types/order";

export interface OrdersFilters {
  status?: OrderStatus;
  obraId?: string;
  proveedorId?: string;
  categoriaId?: string;
  from?: string;
  to?: string;
}

export async function listOrders(filters: OrdersFilters = {}): Promise<Order[]> {
  const { data } = await api.get<{ items: Order[] }>("/orders", {
    params: {
      status: filters.status || undefined,
      obraId: filters.obraId || undefined,
      proveedorId: filters.proveedorId || undefined,
      categoriaId: filters.categoriaId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
  });
  return data.items;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await api.get<{ order: Order }>(`/orders/${id}`);
  return data.order;
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const { data } = await api.post<{ order: Order }>("/orders", input);
  return data.order;
}

export async function updateOrder(id: string, input: Partial<Pick<OrderInput, "notes" | "items">>): Promise<Order> {
  const { data } = await api.put<{ order: Order }>(`/orders/${id}`, input);
  return data.order;
}

export async function assignOrder(id: string, input: AssignOrderInput): Promise<Order> {
  const { data } = await api.patch<{ order: Order }>(`/orders/${id}/assign`, input);
  return data.order;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data } = await api.patch<{ order: Order }>(`/orders/${id}/status`, { status });
  return data.order;
}
