import type { MetodoPago } from "./abonoCliente";

export interface Prestamo {
  id: string;
  amount: number;
  lender: string;
  notes: string | null;
  metodoPago: MetodoPago;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  totalPagado: number;
  saldo: number;
  pagos: PrestamoPago[];
}

export interface PrestamoInput {
  amount: number;
  lender: string;
  notes?: string | null;
  metodoPago: MetodoPago;
}

export interface PrestamoPago {
  id: string;
  amount: number;
  metodoPago: MetodoPago;
  notes: string | null;
  prestamoId: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface PrestamoPagoInput {
  prestamoId: string;
  amount: number;
  metodoPago: MetodoPago;
  notes?: string | null;
}
