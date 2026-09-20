import { api } from "./api";
import type { Categoria, CategoriaInput } from "../types/categoria";

export interface ListCategoriasFilters {
  search?: string;
  isActive?: boolean;
}

export async function listCategorias(filters: ListCategoriasFilters = {}): Promise<Categoria[]> {
  const { data } = await api.get<{ items: Categoria[] }>("/categorias", {
    params: {
      search: filters.search || undefined,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });
  return data.items;
}

export async function createCategoria(input: CategoriaInput): Promise<Categoria> {
  const { data } = await api.post<{ categoria: Categoria }>("/categorias", input);
  return data.categoria;
}

export async function updateCategoria(id: string, input: Partial<CategoriaInput>): Promise<Categoria> {
  const { data } = await api.put<{ categoria: Categoria }>(`/categorias/${id}`, input);
  return data.categoria;
}

export async function deleteCategoria(id: string): Promise<void> {
  await api.delete(`/categorias/${id}`);
}
