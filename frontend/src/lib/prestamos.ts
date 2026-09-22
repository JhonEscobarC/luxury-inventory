import { api } from "./api";
import type { Prestamo, PrestamoInput, PrestamoPago, PrestamoPagoInput } from "../types/prestamo";

export async function listPrestamos(): Promise<Prestamo[]> {
  const { data } = await api.get<{ items: Prestamo[] }>("/prestamos");
  return data.items;
}

export async function createPrestamo(input: PrestamoInput): Promise<Prestamo> {
  const { data } = await api.post<{ prestamo: Prestamo }>("/prestamos", input);
  return data.prestamo;
}

export async function createPrestamoPago(input: PrestamoPagoInput): Promise<PrestamoPago> {
  const { data } = await api.post<{ pago: PrestamoPago }>("/prestamos/pagos", input);
  return data.pago;
}
