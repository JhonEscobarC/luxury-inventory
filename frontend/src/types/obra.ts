export interface ObraUser {
  id: string;
  name: string;
  email: string;
}

export interface Obra {
  id: string;
  name: string;
  address: string | null;
  client: string | null;
  notes: string | null;
  precioVenta: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  proyectoId: string | null;
  proyectoName: string | null;
  users?: ObraUser[];
}

export interface ObraInput {
  name: string;
  address?: string | null;
  client?: string | null;
  notes?: string | null;
  precioVenta?: number | null;
  proyectoId?: string | null;
}
