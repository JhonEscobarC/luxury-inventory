export type EtapaStatus = "PENDIENTE" | "COMPLETADA" | "PAGADA";

export interface Etapa {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  status: EtapaStatus;
  completedAt: string | null;
  paidAt: string | null;
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
}

export interface AsignacionInput {
  obraId: string;
  contratistaId: string;
  totalAmount: number;
  notes?: string | null;
  etapas: EtapaInput[];
}
