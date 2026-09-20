import { useState, type ChangeEvent } from "react";
import type { Order } from "../../types/order";

interface ReceiveOrderModalProps {
  order: Order;
  photoRequired: boolean;
  onClose: () => void;
  onSubmit: (foto: string | null) => Promise<void>;
}

const MAX_SIDE = 1600;

// Reduce la foto (las de celular pesan varios MB) para que suba rapido y quepa en la base.
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function ReceiveOrderModal({ order, photoRequired, onClose, onSubmit }: ReceiveOrderModalProps) {
  const [foto, setFoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsProcessing(true);
    try {
      setFoto(await compressImage(file));
    } catch {
      setError("No se pudo leer la imagen. Intenta con otra foto.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSubmit() {
    if (photoRequired && !foto) {
      setError("Sube una foto como prueba de que el pedido llego.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(foto);
      onClose();
    } catch (submitError: unknown) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo marcar el pedido como recibido.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-container border border-outline-variant p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="text-headline-md-mobile text-primary uppercase">Marcar como recibido</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary shrink-0">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-label-sm text-on-surface-variant uppercase mb-6">{order.obraName}</p>

        <p className="font-body-md text-on-surface-variant mb-4">
          {photoRequired
            ? "Toma o sube una foto como prueba de que el material llego a la obra."
            : "Puedes adjuntar una foto de la recepcion (opcional)."}
        </p>

        <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant hover:border-primary transition-colors p-6 cursor-pointer text-center mb-4">
          {foto ? (
            <img src={foto} alt="Prueba de recepcion" className="max-h-64 object-contain" />
          ) : (
            <>
              <span className="material-symbols-outlined text-primary text-4xl">add_a_photo</span>
              <span className="font-label-sm text-on-surface-variant uppercase">
                {isProcessing ? "Procesando..." : "Tomar o elegir foto"}
              </span>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </label>
        {foto && <p className="font-label-sm text-on-surface-variant/70 uppercase mb-4">Toca la imagen para cambiarla.</p>}

        {error && <p className="text-error font-label-sm uppercase tracking-wider mb-4">{error}</p>}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-outline-variant text-on-surface-variant font-label-sm uppercase py-3 hover:border-primary hover:text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isProcessing}
            className="flex-1 bg-primary-container text-on-primary font-label-sm uppercase py-3 hover:bg-primary-fixed transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Confirmar recepcion"}
          </button>
        </div>
      </div>
    </div>
  );
}
