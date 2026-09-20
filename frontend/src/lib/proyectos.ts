import { api } from "./api";
import type { Proyecto, ProyectoInput } from "../types/proyecto";

export interface ListProyectosFilters {
  search?: string;
  isActive?: boolean;
}

export async function listProyectos(filters: ListProyectosFilters = {}): Promise<Proyecto[]> {
  const { data } = await api.get<{ items: Proyecto[] }>("/proyectos", {
    params: {
      search: filters.search || undefined,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });
  return data.items;
}

export async function createProyecto(input: ProyectoInput): Promise<Proyecto> {
  const { data } = await api.post<{ proyecto: Proyecto }>("/proyectos", input);
  return data.proyecto;
}

export async function updateProyecto(id: string, input: Partial<ProyectoInput>): Promise<Proyecto> {
  const { data } = await api.put<{ proyecto: Proyecto }>(`/proyectos/${id}`, input);
  return data.proyecto;
}

export async function deleteProyecto(id: string): Promise<void> {
  await api.delete(`/proyectos/${id}`);
}
