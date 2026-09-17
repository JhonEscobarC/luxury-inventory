import { api } from "./api";
import type { ClientesReport, GastosFilters, GastosReport, ProveedorDeuda } from "../types/report";

export async function getGastosReport(filters: GastosFilters = {}): Promise<GastosReport> {
  const { data } = await api.get<GastosReport>("/reports/gastos", {
    params: {
      proyectoIds: filters.proyectoIds?.length ? filters.proyectoIds.join(",") : undefined,
      obraIds: filters.obraIds?.length ? filters.obraIds.join(",") : undefined,
      categoriaId: filters.categoriaId || undefined,
      proveedorId: filters.proveedorId || undefined,
      contratistaId: filters.contratistaId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      material: filters.material || undefined,
    },
  });
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
