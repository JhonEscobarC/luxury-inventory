import type { MetodoPago } from "./abonoCliente";

export type { MetodoPago };

export interface GastoAdicional {
  id: string;
  concepto: string;
  amount: number;
  metodoPago: MetodoPago;
  notes: string | null;
  obraId: string | null;
  obraName: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface GastoAdicionalInput {
  concepto: string;
  amount: number;
  metodoPago: MetodoPago;
  notes?: string | null;
  obraId?: string | null;
}
