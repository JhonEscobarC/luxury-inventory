// Convierte una fecha (potencialmente solo con la parte de dia, hora 00:00:00) en el
// ultimo instante de ese mismo dia, para que un filtro "hasta" incluya todo el dia
// seleccionado en vez de excluir casi todos sus eventos por comparar contra medianoche.
export function endOfDay(date: Date): Date {
  const end = new Date(date);
  // z.coerce.date() sobre un string "YYYY-MM-DD" produce medianoche UTC, asi que el
  // fin de dia debe calcularse tambien en UTC (no en la zona horaria del servidor).
  end.setUTCHours(23, 59, 59, 999);
  return end;
}
