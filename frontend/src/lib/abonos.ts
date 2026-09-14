import { api } from "./api";
import type { Abono, AbonoInput } from "../types/abono";

export async function listAbonos(proveedorId?: string): Promise<Abono[]> {
  const { data } = await api.get<{ items: Abono[] }>("/abonos", {
    params: { proveedorId: proveedorId || undefined },
  });
  return data.items;
}

export async function createAbono(input: AbonoInput): Promise<Abono> {
  const { data } = await api.post<{ abono: Abono }>("/abonos", input);
  return data.abono;
}

export async function deleteAbono(id: string): Promise<void> {
  await api.delete(`/abonos/${id}`);
}
