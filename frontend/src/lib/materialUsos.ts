import { api } from "./api";
import type { MaterialUso, MaterialUsoInput } from "../types/materialUso";

export interface ListMaterialUsosFilters {
  obraId?: string;
  productId?: string;
}

export async function listMaterialUsos(filters: ListMaterialUsosFilters = {}): Promise<MaterialUso[]> {
  const { data } = await api.get<{ items: MaterialUso[] }>("/material-usos", {
    params: {
      obraId: filters.obraId || undefined,
      productId: filters.productId || undefined,
    },
  });
  return data.items;
}

export async function createMaterialUso(input: MaterialUsoInput): Promise<MaterialUso> {
  const { data } = await api.post<{ uso: MaterialUso }>("/material-usos", input);
  return data.uso;
}
