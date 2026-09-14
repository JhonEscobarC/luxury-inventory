export interface Contratista {
  id: string;
  name: string;
  oficio: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContratistaInput {
  name: string;
  oficio?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}
