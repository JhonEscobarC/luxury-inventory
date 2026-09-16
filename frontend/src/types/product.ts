export interface Product {
  id: string;
  name: string;
  categoriaId: string | null;
  categoriaName: string | null;
  obraId: string | null;
  obraName: string | null;
  proyectoId: string | null;
  proyectoName: string | null;
  quantity: number;
  unit: string;
  price: number;
  proveedorId: string | null;
  proveedorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  categoriaId?: string | null;
  obraId?: string | null;
  quantity: number;
  unit: string;
  price: number;
  proveedorId?: string | null;
}
