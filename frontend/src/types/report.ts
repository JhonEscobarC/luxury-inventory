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

export interface FinancieroReport {
  proyectos: ProyectoFinanciero[];
  obrasSinProyecto: ObraFinanciero[];
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
