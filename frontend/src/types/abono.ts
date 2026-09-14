export interface Abono {
  id: string;
  amount: number;
  notes: string | null;
  proveedorId: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface AbonoInput {
  proveedorId: string;
  amount: number;
  notes?: string | null;
}
