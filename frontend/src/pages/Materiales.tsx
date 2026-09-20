import { useEffect, useState } from "react";
import { listProducts } from "../lib/products";
import { listMyObras } from "../lib/obras";
import { createMaterialUso } from "../lib/materialUsos";
import type { Product } from "../types/product";
import type { Obra } from "../types/obra";
import type { MaterialUsoInput } from "../types/materialUso";
import { RegistrarUsoModal } from "../components/materiales/RegistrarUsoModal";
import { ProductoHistorialModal } from "../components/materiales/ProductoHistorialModal";
import { usePagination } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";

const selectClass =
  "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3";

export function Materiales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [activeObraId, setActiveObraId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usingProduct, setUsingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const productsResult = await listProducts({ obraId: activeObraId || undefined });
      setProducts(productsResult.items);
    } catch {
      setErrorMessage("No se pudo cargar el inventario de tu obra.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    listMyObras()
      .then(setObras)
      .catch(() => setObras([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeObraId]);

  async function handleRegistrarUso(input: MaterialUsoInput) {
    await createMaterialUso(input);
    await refresh();
  }

  const { pageItems: pageProducts, ...pagination } = usePagination(products);
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Materiales</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            Consulta el material disponible en tu obra y registra lo que se haya usado. Toca un producto para ver su historial.
          </p>
        </div>

        {obras.length > 1 && (
          <div className="w-full md:w-64">
            <select
              value={activeObraId}
              onChange={(event) => setActiveObraId(event.target.value)}
              className={selectClass}
            >
              <option value="">Todas mis obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {obras.length === 0 && !isLoading && (
        <p className="font-label-sm text-on-surface-variant uppercase mb-6">
          Aun no tienes obras asignadas. Pide a un administrador que te asigne una.
        </p>
      )}

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}

      <div className="flex flex-col gap-4 mb-12">
        <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest px-4">
          <div className="col-span-4">Producto</div>
          <div className="col-span-2">Categoria</div>
          <div className="col-span-2">Obra</div>
          <div className="col-span-2 text-right">Disponible</div>
          <div className="col-span-2 text-right">Accion</div>
        </div>

        {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

        {!isLoading && products.length === 0 && (
          <div className="border border-outline-variant bg-surface p-8 text-center">
            <p className="text-on-surface-variant font-label-sm uppercase">Sin materiales disponibles.</p>
          </div>
        )}

        {!isLoading &&
          pageProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => setHistoryProduct(product)}
              className="border border-outline-variant bg-surface p-4 md:px-4 md:py-5 flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center hover:border-primary transition-colors duration-300 cursor-pointer"
            >
              <div className="md:col-span-4 w-full flex flex-col gap-1">
                <span className="font-body-md font-semibold text-on-surface">{product.name}</span>
                <span className="md:hidden font-label-sm text-on-surface-variant uppercase">
                  {product.categoriaName ?? "-"} - {product.obraName ?? "General"}
                </span>
              </div>

              <div className="hidden md:block md:col-span-2 font-label-sm text-on-surface-variant uppercase tracking-wider">
                {product.categoriaName ?? "-"}
              </div>

              <div className="hidden md:block md:col-span-2 font-label-sm text-on-surface-variant uppercase tracking-wider truncate">
                {product.obraName ?? "General"}
              </div>

              <div className="md:col-span-2 w-full flex justify-between md:justify-end items-center gap-2">
                <span className="md:hidden font-label-sm text-on-surface-variant uppercase">Disponible:</span>
                <span className="font-body-md text-on-surface">
                  {product.quantity} {product.unit}
                </span>
              </div>

              <div className="md:col-span-2 w-full flex justify-end">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setUsingProduct(product);
                  }}
                  disabled={product.quantity <= 0}
                  className="border border-primary text-primary font-label-sm uppercase px-4 py-2 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-40 disabled:pointer-events-none w-full md:w-auto"
                >
                  Registrar uso
                </button>
              </div>
            </div>
          ))}
      </div>

      <Pagination {...pagination} onPageChange={pagination.setPage} />

      {historyProduct && <ProductoHistorialModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}

      {usingProduct && (
        <RegistrarUsoModal
          product={usingProduct}
          onClose={() => setUsingProduct(null)}
          onSubmit={handleRegistrarUso}
        />
      )}
    </div>
  );
}
