import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;

// Paginacion en el cliente: vuelve a la pagina 1 cuando cambia la cantidad de items
// (nuevo filtro o busqueda) y ajusta la pagina si la lista se encoge.
export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  );

  return { pageItems, page: currentPage, setPage, totalPages, total: items.length, pageSize };
}
