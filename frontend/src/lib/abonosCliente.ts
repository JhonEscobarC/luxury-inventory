import { api } from "./api";
import type { AbonoCliente, AbonoClienteInput, ObraSaldoCliente } from "../types/abonoCliente";

export async function listAbonosCliente(obraId?: string): Promise<AbonoCliente[]> {
  const { data } = await api.get<{ items: AbonoCliente[] }>("/abonos-cliente", {
    params: { obraId: obraId || undefined },
  });
  return data.items;
}

export async function createAbonoCliente(input: AbonoClienteInput): Promise<AbonoCliente> {
  const { data } = await api.post<{ abono: AbonoCliente }>("/abonos-cliente", input);
  return data.abono;
}

export async function deleteAbonoCliente(id: string): Promise<void> {
  await api.delete(`/abonos-cliente/${id}`);
}

export async function getObraSaldoCliente(obraId: string): Promise<ObraSaldoCliente> {
  const { data } = await api.get<ObraSaldoCliente>(`/abonos-cliente/saldo/${obraId}`);
  return data;
}
