export type OrderStatus = "PENDIENTE" | "CONFIRMADO" | "DESPACHADO" | "CANCELADO";
export type FormaPago = "CONTADO" | "CREDITO";

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  subtotal: number | null;
  categoriaId: string | null;
  categoriaName: string | null;
  productId: string | null;
  productName: string | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  notes: string | null;
  formaPago: FormaPago | null;
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
  categoriaId?: string | null;
}

export interface OrderInput {
  obraId: string;
  notes?: string | null;
  items: OrderItemInput[];
}

export interface AssignOrderInput {
  proveedorId: string;
  notes?: string | null;
  formaPago: FormaPago;
  items: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    categoriaId?: string | null;
  }[];
}
