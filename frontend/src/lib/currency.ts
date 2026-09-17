export const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Por pedido del usuario: los montos no se muestran en pantalla (listas, tablas,
// resumenes, reportes en vivo), solo al exportar (PDF/Excel) o en comprobantes/recibos
// imprimibles. Cambiar a true reactiva la visualizacion en toda la app.
const MONEY_VISIBLE_IN_UI = false;

const HIDDEN_PLACEHOLDER = "•••••";

/**
 * Usar SOLO en pantallas de consulta (listas, tablas, resumenes, dashboards, reportes
 * en pantalla). Los formularios donde el usuario escribe activamente un precio o monto
 * (inputs) no deben usar esto: ahi el valor siempre debe verse mientras se digita.
 *
 * `forceVisible` permite que una pantalla puntual (ej. un boton "Mostrar valores" en
 * Financiero) revele los montos bajo demanda sin afectar el resto de la app.
 */
export function displayCurrency(value: number | null | undefined, forceVisible = false): string {
  if (!MONEY_VISIBLE_IN_UI && !forceVisible) return HIDDEN_PLACEHOLDER;
  if (value === null || value === undefined) return "-";
  return currencyFormatter.format(value);
}
