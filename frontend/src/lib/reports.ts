import { api } from "./api";
import type { FinancieroReport, ProveedorDeuda } from "../types/report";

export async function getFinancieroReport(): Promise<FinancieroReport> {
  const { data } = await api.get<FinancieroReport>("/reports/financiero");
  return data;
}

export async function getProveedoresDeudaReport(): Promise<ProveedorDeuda[]> {
  const { data } = await api.get<{ items: ProveedorDeuda[] }>("/reports/proveedores-deuda");
  return data.items;
}
