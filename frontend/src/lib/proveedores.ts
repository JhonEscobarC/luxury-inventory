import { api } from "./api";
import type { Proveedor, ProveedorInput } from "../types/proveedor";

export interface ListProveedoresFilters {
  search?: string;
  isActive?: boolean;
}

export async function listProveedores(filters: ListProveedoresFilters = {}): Promise<Proveedor[]> {
  const { data } = await api.get<{ items: Proveedor[] }>("/proveedores", {
    params: {
      search: filters.search || undefined,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });
  return data.items;
}

export async function createProveedor(input: ProveedorInput): Promise<Proveedor> {
  const { data } = await api.post<{ proveedor: Proveedor }>("/proveedores", input);
  return data.proveedor;
}

export async function updateProveedor(id: string, input: Partial<ProveedorInput>): Promise<Proveedor> {
  const { data } = await api.put<{ proveedor: Proveedor }>(`/proveedores/${id}`, input);
  return data.proveedor;
}

export async function deleteProveedor(id: string): Promise<void> {
  await api.delete(`/proveedores/${id}`);
}
