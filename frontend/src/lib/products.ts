import { api } from "./api";
import type { Product, ProductInput, ProductoHistorialItem } from "../types/product";

export interface ListProductsResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListProductsFilters {
  search?: string;
  categoriaId?: string;
  /** "" o "none" filtra por stock general (sin obra); omitir trae todas las obras permitidas. */
  obraId?: string;
  /** Agrega todas las obras del proyecto; "none" son las obras sin proyecto. Ignorado si se pasa obraId. */
  proyectoId?: string;
}

// El backend limita cada pagina a 100; se piden todas para que la paginacion de la
// interfaz nunca oculte productos.
export async function listProducts(filters: ListProductsFilters = {}): Promise<ListProductsResult> {
  const params = {
    search: filters.search || undefined,
    categoriaId: filters.categoriaId || undefined,
    obraId: filters.obraId !== undefined ? filters.obraId : undefined,
    proyectoId: filters.proyectoId || undefined,
    pageSize: 100,
  };
  const { data } = await api.get<ListProductsResult>("/products", { params: { ...params, page: 1 } });
  const totalPages = Math.ceil(data.total / 100);
  if (totalPages <= 1) return data;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      api.get<ListProductsResult>("/products", { params: { ...params, page: i + 2 } }),
    ),
  );
  return { ...data, items: [...data.items, ...rest.flatMap((r) => r.data.items)] };
}

export async function listAllProductsForReport(filters: ListProductsFilters = {}): Promise<Product[]> {
  const { data } = await api.get<{ items: Product[] }>("/products/export", {
    params: {
      search: filters.search || undefined,
      categoriaId: filters.categoriaId || undefined,
      obraId: filters.obraId !== undefined ? filters.obraId : undefined,
      proyectoId: filters.proyectoId || undefined,
    },
  });
  return data.items;
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

export async function listProductoHistorial(productId: string): Promise<ProductoHistorialItem[]> {
  const { data } = await api.get<{ items: ProductoHistorialItem[] }>(`/products/${productId}/historial`);
  return data.items;
}
