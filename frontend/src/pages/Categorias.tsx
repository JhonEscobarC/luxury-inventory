import { type FormEvent, useEffect, useState } from "react";
import { createCategoria, listCategorias, setCategoriaActive } from "../lib/categorias";
import type { Categoria } from "../types/categoria";

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setCategorias(await listCategorias({ search: search || undefined }));
    } catch {
      setErrorMessage("No se pudieron cargar las categorias.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(refresh, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      await createCategoria({ name: newName.trim() });
      setNewName("");
      await refresh();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo crear la categoria.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(categoria: Categoria) {
    await setCategoriaActive(categoria.id, !categoria.isActive);
    await refresh();
  }

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Categorias</h2>
        <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
          Lista de categorias disponibles para clasificar materiales de pedidos e inventario. Provisional hasta
          definir la lista definitiva.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          className={inputClass}
          placeholder="Nombre de la nueva categoria"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva categoria
        </button>
      </form>
      {formError && <p className="text-error font-label-sm uppercase mb-6">{formError}</p>}

      <div className="relative mb-8 max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar categorias..."
          className="w-full bg-surface-container border-b border-outline-variant py-3 pl-10 pr-4 font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
      {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

      <div className="flex flex-col gap-3">
        {!isLoading &&
          categorias.map((categoria) => (
            <div
              key={categoria.id}
              className={`border bg-surface p-4 flex items-center justify-between gap-4 transition-colors ${
                categoria.isActive ? "border-outline-variant hover:border-primary" : "border-outline-variant opacity-60"
              }`}
            >
              <span className="font-body-md text-on-surface">{categoria.name}</span>
              <div className="flex items-center gap-4">
                <span
                  className={`font-label-sm uppercase px-2 py-1 border ${
                    categoria.isActive ? "border-primary text-primary" : "border-error text-error"
                  }`}
                >
                  {categoria.isActive ? "Activa" : "Inactiva"}
                </span>
                <button
                  onClick={() => handleToggleActive(categoria)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                  title={categoria.isActive ? "Desactivar" : "Activar"}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {categoria.isActive ? "block" : "check_circle"}
                  </span>
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
