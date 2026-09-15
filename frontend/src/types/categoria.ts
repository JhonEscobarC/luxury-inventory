export interface Categoria {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriaInput {
  name: string;
}
