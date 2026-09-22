import { api } from "./api";
import type { Asignacion, AsignacionInput, EtapaStatus } from "../types/asignacion";
import type { MetodoPago } from "../types/abonoCliente";

export interface ListAsignacionesFilters {
  obraId?: string;
  contratistaId?: string;
}

export async function listAsignaciones(filters: ListAsignacionesFilters = {}): Promise<Asignacion[]> {
  const { data } = await api.get<{ items: Asignacion[] }>("/asignaciones", {
    params: { obraId: filters.obraId || undefined, contratistaId: filters.contratistaId || undefined },
  });
  return data.items;
}

export async function createAsignacion(input: AsignacionInput): Promise<Asignacion> {
  const { data } = await api.post<{ asignacion: Asignacion }>("/asignaciones", input);
  return data.asignacion;
}

export async function updateAsignacion(
  id: string,
  input: Partial<Pick<AsignacionInput, "totalAmount" | "notes" | "etapas">>,
): Promise<Asignacion> {
  const { data } = await api.put<{ asignacion: Asignacion }>(`/asignaciones/${id}`, input);
  return data.asignacion;
}

export async function updateEtapaStatus(
  asignacionId: string,
  etapaId: string,
  status: EtapaStatus,
  metodoPago?: MetodoPago,
): Promise<Asignacion> {
  const { data } = await api.patch<{ asignacion: Asignacion }>(
    `/asignaciones/${asignacionId}/etapas/${etapaId}/status`,
    { status, metodoPago },
  );
  return data.asignacion;
}
