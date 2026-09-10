export type OrderStatus = "PENDIENTE" | "CONFIRMADO" | "DESPACHADO" | "CANCELADO";

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  subtotal: number | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  notes: string | null;
  obraId: string;
  obraName: string;
  proveedorId: string | null;
  proveedorName: string | null;
  createdById: string;
  createdByName: string;
  assignedByName: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  total: number | null;
}

export interface OrderItemInput {
  description: string;
  quantity: number;
  unit: string;
}

export interface OrderInput {
  obraId: string;
  notes?: string | null;
  items: OrderItemInput[];
}

export interface AssignOrderInput {
  proveedorId: string;
  items: { itemId: string; unitPrice: number }[];
}
