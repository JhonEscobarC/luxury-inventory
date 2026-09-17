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
