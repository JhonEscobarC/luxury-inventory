import type { FormaPago } from "./order";

export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA";

export interface AbonoCliente {
  id: string;
  amount: number;
  notes: string | null;
  formaPago: FormaPago | null;
  metodoPago: MetodoPago | null;
  obraId: string;
  obraName: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface AbonoClienteInput {
  obraId: string;
  amount: number;
  notes?: string | null;
  formaPago: FormaPago;
  metodoPago: MetodoPago;
}

export interface ObraSaldoCliente {
  precioVenta: number | null;
  totalAbonado: number;
  saldo: number | null;
}
