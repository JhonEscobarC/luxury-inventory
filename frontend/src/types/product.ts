export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  proveedorId: string | null;
  proveedorName: string | null;
  minStock: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  proveedorId?: string | null;
  minStock: number;
}
