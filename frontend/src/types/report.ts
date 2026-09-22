export interface ObraFinanciero {
  obraId: string;
  obraName: string;
  isActive: boolean;
  proyectoId: string | null;
  gastoMaterial: number;
  gastoOperacion: number;
  total: number;
}

export interface ProyectoFinanciero {
  proyectoId: string;
  proyectoName: string;
  isActive: boolean;
  obras: ObraFinanciero[];
  gastoMaterial: number;
  gastoOperacion: number;
  total: number;
}

export interface GastoPedidoDetalle {
  orderId: string;
  obraId: string;
  obraName: string;
  proveedorName: string | null;
  categoriaName: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
}

export interface GastoContratistaDetalle {
  obraId: string;
  obraName: string;
  contratistaName: string;
  totalAmount: number;
  createdAt: string;
}

export interface GastosReport {
  proyectos: ProyectoFinanciero[];
  obrasSinProyecto: ObraFinanciero[];
  pedidosDetalle: GastoPedidoDetalle[];
  contratistasDetalle: GastoContratistaDetalle[];
}

export interface GastosFilters {
  proyectoIds?: string[];
  obraIds?: string[];
  categoriaId?: string;
  proveedorId?: string;
  contratistaId?: string;
  from?: string;
  to?: string;
  material?: string;
}

export interface ProveedorDeuda {
  proveedorId: string;
  proveedorName: string;
  isActive: boolean;
  totalDespachado: number;
  totalAbonado: number;
  saldo: number;
}

export interface ObraClientes {
  obraId: string;
  obraName: string;
  client: string | null;
  isActive: boolean;
  proyectoId: string | null;
  precioVenta: number | null;
  totalAbonado: number;
  saldo: number | null;
}

export interface ProyectoClientes {
  proyectoId: string;
  proyectoName: string;
  isActive: boolean;
  obras: ObraClientes[];
  precioVenta: number;
  totalAbonado: number;
}

export interface ClientesReport {
  proyectos: ProyectoClientes[];
  obrasSinProyecto: ObraClientes[];
  totalPrecioVenta: number;
  totalAbonado: number;
}

export type TablaTab = "inventario" | "proveedores" | "contratistas" | "clientes";

export interface TablaFilters {
  proyectoId?: string;
  obraId?: string;
  from?: string;
  to?: string;
}

export interface TablaInventarioRow {
  id: string;
  name: string;
  categoriaName: string | null;
  obraName: string;
  proyectoName: string | null;
  proveedorName: string | null;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  createdAt: string;
}

export interface TablaProveedorRow {
  proveedorId: string;
  proveedorName: string;
  totalGastado: number;
  totalPagado: number;
  saldoActual: number;
}

export interface TablaContratistaRow {
  contratistaId: string;
  contratistaName: string;
  totalAsignado: number;
  totalPagado: number;
  saldoActual: number;
}

export interface TablaClienteRow {
  obraId: string;
  obraName: string;
  proyectoName: string | null;
  client: string | null;
  precioVenta: number | null;
  totalAbonado: number;
  saldoActual: number | null;
}

export interface TablaProveedorCompraRow {
  proveedorName: string;
  obraName: string;
  proyectoName: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  formaPago: string | null;
  createdAt: string;
}

export interface TablaProveedorPagoRow {
  proveedorName: string;
  amount: number;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface TablaContratistaEtapaRow {
  contratistaName: string;
  obraName: string;
  proyectoName: string | null;
  etapaName: string;
  percentage: number;
  monto: number;
  status: string;
  completedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface TablaClienteAbonoRow {
  obraName: string;
  proyectoName: string | null;
  client: string | null;
  amount: number;
  formaPago: string | null;
  metodoPago: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
}

export type CuentaCodigo = "1105" | "1110" | "1305" | "1435" | "2205" | "2335" | "5195";

export interface CuentaRow {
  codigo: CuentaCodigo;
  grupo: string;
  nombre: string;
  saldo: number;
}
