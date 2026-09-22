import type { MetodoPago } from "./abonoCliente";

export type { MetodoPago };

export type GastoTipo = "GENERAL" | "EMPLEADO";

export interface GastoAdicional {
  id: string;
  concepto: string;
  amount: number;
  metodoPago: MetodoPago;
  tipo: GastoTipo;
  empleadoNombre: string | null;
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
  tipo?: GastoTipo;
  empleadoNombre?: string | null;
}
