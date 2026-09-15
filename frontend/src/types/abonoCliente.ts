export interface AbonoCliente {
  id: string;
  amount: number;
  notes: string | null;
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
}

export interface ObraSaldoCliente {
  precioVenta: number | null;
  totalAbonado: number;
  saldo: number | null;
}
