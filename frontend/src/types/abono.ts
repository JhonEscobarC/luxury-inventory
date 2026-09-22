import type { MetodoPago } from "./abonoCliente";

export interface Abono {
  id: string;
  amount: number;
  notes: string | null;
  metodoPago: MetodoPago | null;
  proveedorId: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface AbonoInput {
  proveedorId: string;
  amount: number;
  notes?: string | null;
  metodoPago: MetodoPago;
}
