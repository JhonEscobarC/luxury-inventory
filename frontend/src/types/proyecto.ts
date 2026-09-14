export interface ProyectoObraSummary {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Proyecto {
  id: string;
  name: string;
  client: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  obras?: ProyectoObraSummary[];
}

export interface ProyectoInput {
  name: string;
  client?: string | null;
  notes?: string | null;
}
