export type HistorialTipo =
  | "PEDIDO_CREADO"
  | "PEDIDO_CONFIRMADO"
  | "PEDIDO_DESPACHADO"
  | "PEDIDO_CANCELADO"
  | "ASIGNACION_CREADA"
  | "ETAPA_COMPLETADA"
  | "ETAPA_PAGADA"
  | "ABONO_REGISTRADO"
  | "MATERIAL_USADO"
  | "ABONO_CLIENTE_REGISTRADO"
  | "GASTO_ADICIONAL_REGISTRADO"
  | "PRESTAMO_REGISTRADO"
  | "PRESTAMO_PAGO_REGISTRADO";

export interface HistorialEvento {
  id: string;
  tipo: HistorialTipo;
  descripcion: string;
  monto: number | null;
  createdAt: string;
  userName: string | null;
  obraId: string | null;
  obraName: string | null;
  proveedorId: string | null;
  proveedorName: string | null;
  contratistaId: string | null;
  contratistaName: string | null;
  orderId: string | null;
  asignacionId: string | null;
  abonoId: string | null;
  abonoClienteId: string | null;
  gastoAdicionalId: string | null;
  prestamoId: string | null;
  prestamoPagoId: string | null;
}
