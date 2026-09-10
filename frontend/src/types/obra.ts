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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  users?: ObraUser[];
}

export interface ObraInput {
  name: string;
  address?: string | null;
  client?: string | null;
  notes?: string | null;
}
