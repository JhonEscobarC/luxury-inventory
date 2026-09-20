import { api } from "./api";
import type { GastoAdicional, GastoAdicionalInput } from "../types/gastoAdicional";

export async function listGastosAdicionales(obraId?: string): Promise<GastoAdicional[]> {
  const { data } = await api.get<{ items: GastoAdicional[] }>("/gastos-adicionales", {
    params: { obraId: obraId || undefined },
  });
  return data.items;
}

export async function getGastoAdicional(id: string): Promise<GastoAdicional> {
  const { data } = await api.get<{ gasto: GastoAdicional }>(`/gastos-adicionales/${id}`);
  return data.gasto;
}

export async function createGastoAdicional(input: GastoAdicionalInput): Promise<GastoAdicional> {
  const { data } = await api.post<{ gasto: GastoAdicional }>("/gastos-adicionales", input);
  return data.gasto;
}

export async function deleteGastoAdicional(id: string): Promise<void> {
  await api.delete(`/gastos-adicionales/${id}`);
}
