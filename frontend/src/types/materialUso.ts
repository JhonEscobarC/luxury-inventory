export interface MaterialUso {
  id: string;
  quantity: number;
  reason: string;
  createdAt: string;
  productId: string;
  productName: string;
  unit: string;
  obraId: string;
  obraName: string;
  userId: string | null;
  userName: string | null;
}

export interface MaterialUsoInput {
  productId: string;
  quantity: number;
  reason: string;
}
