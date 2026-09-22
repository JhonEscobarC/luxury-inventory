import { api } from "./api";
import type { ObraEtapa } from "../types/obraEtapa";

export async function listObraEtapas(obraId: string): Promise<ObraEtapa[]> {
  if (!obraId) return [];
  const { data } = await api.get<{ items: ObraEtapa[] }>("/obra-etapas", { params: { obraId } });
  return data.items;
}

export async function createObraEtapa(obraId: string, name: string): Promise<ObraEtapa> {
  const { data } = await api.post<{ etapa: ObraEtapa }>("/obra-etapas", { obraId, name });
  return data.etapa;
}

export async function reorderObraEtapas(obraId: string, orderedIds: string[]): Promise<ObraEtapa[]> {
  const { data } = await api.put<{ items: ObraEtapa[] }>("/obra-etapas/reorder", { obraId, orderedIds });
  return data.items;
}

export async function deleteObraEtapa(id: string): Promise<void> {
  await api.delete(`/obra-etapas/${id}`);
}
