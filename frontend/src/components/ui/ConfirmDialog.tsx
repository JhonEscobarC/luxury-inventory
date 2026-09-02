interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "Confirmar", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-surface-container border border-outline-variant p-6">
        <h3 className="text-headline-md-mobile text-on-surface uppercase mb-3">{title}</h3>
        <p className="font-body-md text-on-surface-variant mb-8">{message}</p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 border border-outline-variant text-on-surface-variant font-label-sm uppercase py-3 hover:border-primary hover:text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 border border-error text-error font-label-sm uppercase py-3 hover:bg-error hover:text-on-error transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
