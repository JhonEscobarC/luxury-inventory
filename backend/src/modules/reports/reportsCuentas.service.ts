import { EtapaStatus, MetodoPago } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  etapaAmount,
  getTablaClientes,
  getTablaContratistas,
  getTablaInventario,
  getTablaProveedores,
} from "./reportsTabla.service";

export type CuentaCodigo = "1105" | "1110" | "1305" | "1435" | "2205" | "2335" | "5195";

export interface CuentaRow {
  codigo: CuentaCodigo;
  grupo: string;
  nombre: string;
  saldo: number;
}

// Caja/Bancos no tienen un modelo propio de saldo bancario: se aproximan sumando los
// movimientos de dinero que ya registran un metodoPago (EFECTIVO vs TRANSFERENCIA/TARJETA).
// Los abonos a proveedor y las cuotas de contratista pagadas antes de agregar este campo
// quedan con metodoPago nulo y no entran en esta aproximacion (quedan fuera de Caja y
// Bancos, no se pierden en ningun otro lado: siguen contando en Proveedores/Contratistas).
async function getCajaYBancos(): Promise<{ caja: number; bancos: number }> {
  const [abonosCliente, abonosProveedor, gastos, etapasPagadas] = await Promise.all([
    prisma.abonoCliente.findMany({ select: { amount: true, metodoPago: true } }),
    prisma.abono.findMany({ select: { amount: true, metodoPago: true } }),
    prisma.gastoAdicional.findMany({ select: { amount: true, metodoPago: true } }),
    prisma.contratistaEtapa.findMany({
      where: { status: EtapaStatus.PAGADA },
      select: { percentage: true, metodoPago: true, asignacion: { select: { totalAmount: true } } },
    }),
  ]);

  const isEfectivo = (m: MetodoPago | null) => m === MetodoPago.EFECTIVO;
  const isBanco = (m: MetodoPago | null) => m === MetodoPago.TRANSFERENCIA || m === MetodoPago.TARJETA;

  const sum = (rows: { amount: unknown; metodoPago: MetodoPago | null }[], predicate: (m: MetodoPago | null) => boolean) =>
    rows.filter((r) => predicate(r.metodoPago)).reduce((total, r) => total + Number(r.amount), 0);

  const sumEtapas = (predicate: (m: MetodoPago | null) => boolean) =>
    etapasPagadas
      .filter((e) => predicate(e.metodoPago))
      .reduce((total, e) => total + etapaAmount(e.asignacion, e), 0);

  const entradasEfectivo = sum(abonosCliente, isEfectivo);
  const salidasEfectivo = sum(abonosProveedor, isEfectivo) + sum(gastos, isEfectivo) + sumEtapas(isEfectivo);

  const entradasBanco = sum(abonosCliente, isBanco);
  const salidasBanco = sum(abonosProveedor, isBanco) + sum(gastos, isBanco) + sumEtapas(isBanco);

  return {
    caja: entradasEfectivo - salidasEfectivo,
    bancos: entradasBanco - salidasBanco,
  };
}

// Reporte general del plan de cuentas: un saldo global (no filtrado por obra/proyecto/
// periodo) por cada cuenta. Los rubros de Proveedores/Contratistas/Clientes/Inventarios
// reutilizan las mismas funciones que alimentan la pestana "tabla" de Reportes (una sola
// fuente de verdad), sumando todas sus filas sin filtro.
export async function getCuentasReport(): Promise<CuentaRow[]> {
  const [{ caja, bancos }, proveedores, contratistas, clientes, inventario, gastos] = await Promise.all([
    getCajaYBancos(),
    getTablaProveedores({}),
    getTablaContratistas({}),
    getTablaClientes({}),
    getTablaInventario({}),
    prisma.gastoAdicional.aggregate({ _sum: { amount: true } }),
  ]);

  const saldoProveedores = proveedores.reduce((sum, p) => sum + p.saldoActual, 0);
  const saldoContratistas = contratistas.reduce((sum, c) => sum + c.saldoActual, 0);
  const saldoClientes = clientes.reduce((sum, c) => sum + (c.saldoActual ?? 0), 0);
  const valorInventario = inventario.reduce((sum, p) => sum + p.total, 0);

  return [
    { codigo: "1105", grupo: "Disponible", nombre: "Caja", saldo: caja },
    { codigo: "1110", grupo: "Disponible", nombre: "Bancos", saldo: bancos },
    { codigo: "1305", grupo: "Deudores", nombre: "Clientes", saldo: saldoClientes },
    { codigo: "1435", grupo: "Inventarios", nombre: "Inventarios", saldo: valorInventario },
    { codigo: "2205", grupo: "Proveedores", nombre: "Proveedores nacionales", saldo: saldoProveedores },
    { codigo: "2335", grupo: "Cuentas por pagar", nombre: "Contratistas", saldo: saldoContratistas },
    { codigo: "5195", grupo: "Gastos", nombre: "Gastos diversos", saldo: Number(gastos._sum.amount ?? 0) },
  ];
}
