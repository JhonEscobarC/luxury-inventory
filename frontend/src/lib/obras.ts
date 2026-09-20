import { api } from "./api";
import type { Obra, ObraInput } from "../types/obra";

export interface ListObrasFilters {
  search?: string;
  isActive?: boolean;
  /** Pasa "none" para obtener solo las obras sin proyecto asignado. */
  proyectoId?: string;
}

export async function listObras(filters: ListObrasFilters = {}): Promise<Obra[]> {
  const { data } = await api.get<{ items: Obra[] }>("/obras", {
    params: {
      search: filters.search || undefined,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
      proyectoId: filters.proyectoId || undefined,
    },
  });
  return data.items;
}

export async function listMyObras(): Promise<Obra[]> {
  const { data } = await api.get<{ items: Obra[] }>("/obras/mine");
  return data.items;
}

export async function createObra(input: ObraInput): Promise<Obra> {
  const { data } = await api.post<{ obra: Obra }>("/obras", input);
  return data.obra;
}

export async function updateObra(id: string, input: Partial<ObraInput>): Promise<Obra> {
  const { data } = await api.put<{ obra: Obra }>(`/obras/${id}`, input);
  return data.obra;
}

export async function deleteObra(id: string): Promise<void> {
  await api.delete(`/obras/${id}`);
}

export async function setObraUsers(id: string, userIds: string[]): Promise<Obra> {
  const { data } = await api.patch<{ obra: Obra }>(`/obras/${id}/users`, { userIds });
  return data.obra;
}
