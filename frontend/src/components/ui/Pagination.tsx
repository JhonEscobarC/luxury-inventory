interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const buttonClass =
  "border border-outline-variant text-on-surface-variant font-label-sm uppercase px-4 py-2 flex items-center gap-1 hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none";

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
      <p className="font-label-sm text-on-surface-variant uppercase">
        {from}-{to} de {total}
      </p>
      <div className="flex items-center gap-3">
        <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          Anterior
        </button>
        <span className="font-label-sm text-on-surface-variant uppercase whitespace-nowrap">
          Pagina {page} de {totalPages}
        </span>
        <button
          type="button"
          className={buttonClass}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
