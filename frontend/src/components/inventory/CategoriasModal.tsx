import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { createCategoria, deleteCategoria, listCategorias, updateCategoria } from "../../lib/categorias";
import type { Categoria } from "../../types/categoria";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface CategoriasModalProps {
  onClose: () => void;
  onChanged: () => void;
}

export function CategoriasModal({ onClose, onChanged }: CategoriasModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingCategoria, setDeletingCategoria] = useState<Categoria | null>(null);

  const inputClass =
    "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3 placeholder-on-surface-variant/50";

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      setCategorias(await listCategorias());
    } catch {
      setError("No se pudieron cargar las categorias.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await createCategoria({ name: newName.trim() });
      setNewName("");
      await refresh();
      onChanged();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo crear la categoria.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(categoria: Categoria) {
    setError(null);
    setEditingId(categoria.id);
    setEditingName(categoria.name);
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId || !editingName.trim()) return;
    setError(null);
    setIsSavingEdit(true);
    try {
      await updateCategoria(editingId, { name: editingName.trim() });
      setEditingId(null);
      await refresh();
      onChanged();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo renombrar la categoria.";
      setError(message);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!deletingCategoria) return;
    await deleteCategoria(deletingCategoria.id);
    setDeletingCategoria(null);
    await refresh();
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">Categorias</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase mb-6">
          Lista provisional hasta definir la lista definitiva.
        </p>

        <form onSubmit={handleCreate} className="flex gap-3 mb-6">
          <input
            className={inputClass}
            placeholder="Nueva categoria"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="submit"
            disabled={isCreating}
            className="bg-primary-container text-on-primary font-label-sm uppercase px-5 hover:bg-primary-fixed transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            Agregar
          </button>
        </form>

        {error && <p className="text-error font-label-sm uppercase tracking-wider mb-4">{error}</p>}
        {isLoading && <p className="text-on-surface-variant font-label-sm uppercase py-6">Cargando...</p>}

        <div className="flex flex-col gap-2">
          {!isLoading && categorias.length === 0 && (
            <p className="text-on-surface-variant/60 font-label-sm uppercase py-6">Sin categorias registradas</p>
          )}
          {!isLoading &&
            categorias.map((categoria) => (
              <div
                key={categoria.id}
                className="border border-outline-variant p-3 flex items-center justify-between gap-3"
              >
                {editingId === categoria.id ? (
                  <form onSubmit={handleSaveEdit} className="flex-1 flex items-center gap-2">
                    <input
                      autoFocus
                      className={inputClass}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="text-primary hover:text-primary-fixed transition-colors disabled:opacity-60"
                      title="Guardar"
                    >
                      <span className="material-symbols-outlined text-[20px]">check</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-on-surface-variant hover:text-error transition-colors"
                      title="Cancelar"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="font-body-md text-on-surface">{categoria.name}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(categoria)}
                        className="text-on-surface-variant hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeletingCategoria(categoria)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full border border-outline-variant text-on-surface-variant font-label-sm uppercase py-3 hover:border-primary hover:text-primary transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {deletingCategoria && (
        <ConfirmDialog
          title="Eliminar categoria"
          message={`¿Seguro que deseas eliminar "${deletingCategoria.name}"? Los productos y materiales que la tenian asignada quedaran sin categoria.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeletingCategoria(null)}
        />
      )}
    </div>
  );
}
