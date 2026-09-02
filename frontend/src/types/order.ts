export type OrderStatus = "PENDIENTE" | "CONFIRMADO" | "DESPACHADO" | "CANCELADO";
export type OrderSource = "MANUAL" | "WHATSAPP";

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Alias usado por el modulo de reportes.
export type OrderReportItem = OrderItem;

export interface Order {
  id: string;
  status: OrderStatus;
  source: OrderSource;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  total: number;
}

// Alias usado por el modulo de reportes.
export type OrderReport = Order;

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface OrderInput {
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  items: OrderItemInput[];
}
