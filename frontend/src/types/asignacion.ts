import type { MetodoPago } from "./abonoCliente";

export type EtapaStatus = "PENDIENTE" | "COMPLETADA" | "PAGADA";

export interface Etapa {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  status: EtapaStatus;
  completedAt: string | null;
  paidAt: string | null;
  metodoPago: MetodoPago | null;
  obraEtapaId: string | null;
  obraEtapaName: string | null;
}

export interface Asignacion {
  id: string;
  obraId: string;
  obraName: string;
  contratistaId: string;
  contratistaName: string;
  contratistaOficio: string | null;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  etapas: Etapa[];
  totalPercentage: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface EtapaInput {
  name: string;
  percentage: number;
  obraEtapaId?: string | null;
}

export interface AsignacionInput {
  obraId: string;
  contratistaId: string;
  totalAmount: number;
  notes?: string | null;
  etapas: EtapaInput[];
}
