import { api } from "./api";
import type { HistorialEvento, HistorialTipo } from "../types/historial";

export interface ListHistorialFilters {
  tipo?: HistorialTipo;
  obraId?: string;
  proveedorId?: string;
  contratistaId?: string;
  from?: string;
  to?: string;
}

export async function listHistorial(filters: ListHistorialFilters = {}): Promise<HistorialEvento[]> {
  const { data } = await api.get<{ items: HistorialEvento[] }>("/historial", {
    params: {
      tipo: filters.tipo || undefined,
      obraId: filters.obraId || undefined,
      proveedorId: filters.proveedorId || undefined,
      contratistaId: filters.contratistaId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
  });
  return data.items;
}
