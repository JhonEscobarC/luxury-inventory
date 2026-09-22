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
  proveedorId: string | null;
  proveedorName: string | null;
  obraEtapaId: string;
  obraEtapaName: string;
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
  /** true si el pedido usa un proveedor distinto por material y no coinciden entre si. */
  hasMultipleProveedores: boolean;
  createdById: string | null;
  createdByName: string | null;
  assignedByName: string | null;
  hasRecepcionFoto: boolean;
  recepcionAt: string | null;
  recepcionByName: string | null;
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
  obraEtapaId: string;
}

export interface OrderInput {
  obraId: string;
  notes?: string | null;
  items: OrderItemInput[];
}

export interface AssignOrderInput {
  /** null = proveedor distinto por material (cada item trae el suyo). */
  proveedorId: string | null;
  notes?: string | null;
  formaPago: FormaPago;
  items: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    categoriaId?: string | null;
    proveedorId?: string | null;
    obraEtapaId: string;
  }[];
}
