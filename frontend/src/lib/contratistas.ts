import { api } from "./api";
import type { Contratista, ContratistaInput } from "../types/contratista";

export interface ListContratistasFilters {
  search?: string;
  isActive?: boolean;
}

export async function listContratistas(filters: ListContratistasFilters = {}): Promise<Contratista[]> {
  const { data } = await api.get<{ items: Contratista[] }>("/contratistas", {
    params: {
      search: filters.search || undefined,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });
  return data.items;
}

export async function createContratista(input: ContratistaInput): Promise<Contratista> {
  const { data } = await api.post<{ contratista: Contratista }>("/contratistas", input);
  return data.contratista;
}

export async function updateContratista(id: string, input: Partial<ContratistaInput>): Promise<Contratista> {
  const { data } = await api.put<{ contratista: Contratista }>(`/contratistas/${id}`, input);
  return data.contratista;
}

export async function deleteContratista(id: string): Promise<void> {
  await api.delete(`/contratistas/${id}`);
}
