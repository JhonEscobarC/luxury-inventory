import { api } from "./api";
import type { ClientesReport, FinancieroReport, ProveedorDeuda } from "../types/report";

export async function getFinancieroReport(): Promise<FinancieroReport> {
  const { data } = await api.get<FinancieroReport>("/reports/financiero");
  return data;
}

export async function getProveedoresDeudaReport(): Promise<ProveedorDeuda[]> {
  const { data } = await api.get<{ items: ProveedorDeuda[] }>("/reports/proveedores-deuda");
  return data.items;
}

export async function getClientesReport(): Promise<ClientesReport> {
  const { data } = await api.get<ClientesReport>("/reports/clientes");
  return data;
}
