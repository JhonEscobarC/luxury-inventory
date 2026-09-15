import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createProduct, deleteProduct, listProducts, updateProduct } from "../lib/products";
import { listProveedores } from "../lib/proveedores";
import { listCategorias } from "../lib/categorias";
import type { Product, ProductInput } from "../types/product";
import type { Proveedor } from "../types/proveedor";
import type { Categoria } from "../types/categoria";
import { ProductFormModal } from "../components/inventory/ProductFormModal";
import { CategoriasModal } from "../components/inventory/CategoriasModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function Inventory() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "CONTABILIDAD";

  const [products, setProducts] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoriaId, setActiveCategoriaId] = useState<string | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isManagingCategorias, setIsManagingCategorias] = useState(false);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [productsResult, categoriasResult] = await Promise.all([
        listProducts({
          search: search || undefined,
          categoriaId: activeCategoriaId || undefined,
          lowStock: showLowStockOnly,
        }),
        listCategorias(),
      ]);
      setProducts(productsResult.items);
      setCategorias(categoriasResult);
    } catch {
      setErrorMessage("No se pudo cargar el inventario.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    listProveedores({ isActive: true })
      .then(setProveedores)
      .catch(() => setProveedores([]));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(refresh, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCategoriaId, showLowStockOnly]);

  const lowStockCount = useMemo(() => products.filter((product) => product.isLowStock).length, [products]);

  async function handleCreate(input: ProductInput) {
    await createProduct(input);
    await refresh();
  }

  async function handleUpdate(input: ProductInput) {
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, input);
    await refresh();
  }

  async function handleDelete() {
    if (!deletingProduct) return;
    await deleteProduct(deletingProduct.id);
    setDeletingProduct(null);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Inventario</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            Gestiona materiales de construccion, niveles de stock y precios.
            {lowStockCount > 0 && (
              <span className="text-error font-semibold"> {lowStockCount} producto(s) con stock bajo.</span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar productos..."
              className="w-full bg-surface-container border-b border-outline-variant py-3 pl-10 pr-4 font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          {canManage && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nuevo producto
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div className="w-48">
          <label className="font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2">
            Categoria
          </label>
          <select
            value={activeCategoriaId ?? ""}
            onChange={(event) => setActiveCategoriaId(event.target.value || null)}
            className="w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3"
          >
            <option value="">Todos</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.name}
              </option>
            ))}
          </select>
        </div>

        {canManage && (
          <button
            onClick={() => setIsManagingCategorias(true)}
            className="font-label-sm uppercase px-4 py-3 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
            title="Crear, editar o eliminar categorias"
          >
            <span className="material-symbols-outlined text-[18px]">category</span>
            Categorias
          </button>
        )}

        <button
          onClick={() => setShowLowStockOnly((prev) => !prev)}
          className={`font-label-sm uppercase px-4 py-3 border transition-colors ${
            showLowStockOnly
              ? "border-error text-error"
              : "border-outline-variant text-on-surface-variant hover:border-error hover:text-error"
          }`}
        >
          Stock bajo
        </button>
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}

      <div className="flex flex-col gap-4">
        <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest px-4">
          <div className="col-span-4">Producto</div>
          <div className="col-span-2">Categoria</div>
          <div className="col-span-2 text-right">Stock</div>
          <div className="col-span-2 text-right">Precio unitario</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

        {!isLoading && products.length === 0 && (
          <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Sin productos para mostrar.</p>
        )}

        {!isLoading &&
          products.map((product) => (
            <div
              key={product.id}
              className={`group border bg-surface p-4 md:px-4 md:py-5 flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center relative ${
                product.isLowStock ? "border-secondary" : "border-outline-variant hover:border-primary"
              } transition-colors duration-300`}
            >
              <div className="md:col-span-4 w-full flex flex-col gap-1">
                <span className="font-body-md font-semibold text-on-surface">{product.name}</span>
                <span className="md:hidden font-label-sm text-on-surface-variant uppercase">
                  {product.categoriaName}
                </span>
                {product.proveedorName && (
                  <span className="font-label-sm text-on-surface-variant/70 uppercase">{product.proveedorName}</span>
                )}
              </div>

              <div className="hidden md:block md:col-span-2 font-label-sm text-on-surface-variant uppercase tracking-wider">
                {product.categoriaName ?? "-"}
              </div>

              <div className="md:col-span-2 w-full flex justify-between md:justify-end items-center gap-2">
                <span className="md:hidden font-label-sm text-on-surface-variant uppercase">Stock:</span>
                <div className="flex items-center gap-2">
                  {product.isLowStock && (
                    <span className="material-symbols-outlined text-[16px] text-secondary">warning</span>
                  )}
                  <span
                    className={`font-body-md ${product.isLowStock ? "text-secondary font-bold" : "text-on-surface"}`}
                  >
                    {product.quantity} {product.unit}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 w-full flex justify-between md:justify-end items-center font-body-md text-on-surface">
                <span className="md:hidden font-label-sm text-on-surface-variant uppercase">Precio:</span>
                <span>{currencyFormatter.format(product.price)}</span>
              </div>

              <div className="md:col-span-2 w-full flex justify-end items-center gap-4">
                {canManage ? (
                  <>
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      onClick={() => setDeletingProduct(product)}
                      className="text-on-surface-variant hover:text-error transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </>
                ) : (
                  <span className="font-label-sm text-on-surface-variant/50 uppercase">Solo lectura</span>
                )}
              </div>
            </div>
          ))}
      </div>

      {isCreating && (
        <ProductFormModal
          product={null}
          proveedores={proveedores}
          categorias={categorias}
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingProduct && (
        <ProductFormModal
          product={editingProduct}
          proveedores={proveedores}
          categorias={categorias}
          onClose={() => setEditingProduct(null)}
          onSubmit={handleUpdate}
        />
      )}

      {deletingProduct && (
        <ConfirmDialog
          title="Eliminar producto"
          message={`¿Seguro que deseas eliminar "${deletingProduct.name}"? Esta accion no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeletingProduct(null)}
        />
      )}

      {isManagingCategorias && (
        <CategoriasModal onClose={() => setIsManagingCategorias(false)} onChanged={refresh} />
      )}
    </div>
  );
}
