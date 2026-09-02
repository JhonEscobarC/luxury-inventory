import { api } from "./api";
import type { Product, ProductInput } from "../types/product";

export interface ListProductsResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListProductsFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export async function listProducts(filters: ListProductsFilters = {}): Promise<ListProductsResult> {
  const { data } = await api.get<ListProductsResult>("/products", {
    params: {
      search: filters.search || undefined,
      category: filters.category || undefined,
      lowStock: filters.lowStock ? "true" : undefined,
      pageSize: 100,
    },
  });
  return data;
}

export async function listAllProductsForReport(filters: ListProductsFilters = {}): Promise<Product[]> {
  const { data } = await api.get<{ items: Product[] }>("/products/export", {
    params: {
      search: filters.search || undefined,
      category: filters.category || undefined,
      lowStock: filters.lowStock ? "true" : undefined,
    },
  });
  return data.items;
}

export async function listCategories(): Promise<string[]> {
  const { data } = await api.get<{ categories: string[] }>("/products/categories");
  return data.categories;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await api.post<{ product: Product }>("/products", input);
  return data.product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data } = await api.put<{ product: Product }>(`/products/${id}`, input);
  return data.product;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
