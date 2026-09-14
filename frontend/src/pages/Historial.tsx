import { useEffect, useState } from "react";
import { listHistorial } from "../lib/historial";
import { listObras } from "../lib/obras";
import { listProveedores } from "../lib/proveedores";
import type { HistorialEvento, HistorialTipo } from "../types/historial";
import type { Obra } from "../types/obra";
import type { Proveedor } from "../types/proveedor";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const TIPO_OPTIONS: { value: HistorialTipo | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PEDIDO_CREADO", label: "Pedido creado" },
  { value: "PEDIDO_CONFIRMADO", label: "Pedido confirmado" },
  { value: "PEDIDO_DESPACHADO", label: "Pedido despachado" },
  { value: "PEDIDO_CANCELADO", label: "Pedido cancelado" },
  { value: "ASIGNACION_CREADA", label: "Contratista asignado" },
  { value: "ETAPA_COMPLETADA", label: "Etapa completada" },
  { value: "ETAPA_PAGADA", label: "Etapa pagada" },
  { value: "ABONO_REGISTRADO", label: "Abono registrado" },
];

const TIPO_META: Record<HistorialTipo, { label: string; icon: string; color: string }> = {
  PEDIDO_CREADO: { label: "Pedido creado", icon: "assignment", color: "text-on-surface-variant" },
  PEDIDO_CONFIRMADO: { label: "Pedido confirmado", icon: "fact_check", color: "text-tertiary" },
  PEDIDO_DESPACHADO: { label: "Pedido despachado", icon: "local_shipping", color: "text-secondary" },
  PEDIDO_CANCELADO: { label: "Pedido cancelado", icon: "cancel", color: "text-error" },
  ASIGNACION_CREADA: { label: "Contratista asignado", icon: "engineering", color: "text-on-surface-variant" },
  ETAPA_COMPLETADA: { label: "Etapa completada", icon: "task_alt", color: "text-tertiary" },
  ETAPA_PAGADA: { label: "Etapa pagada", icon: "payments", color: "text-primary" },
  ABONO_REGISTRADO: { label: "Abono registrado", icon: "payments", color: "text-primary" },
};

const selectClass =
  "w-full bg-surface border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-body-md px-3 py-3";
const labelClass = "font-label-sm text-on-surface-variant uppercase tracking-widest block mb-2";

export function Historial() {
  const [eventos, setEventos] = useState<HistorialEvento[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tipo, setTipo] = useState<HistorialTipo | "">("");
  const [obraId, setObraId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    listObras({}).then(setObras).catch(() => setObras([]));
    listProveedores({}).then(setProveedores).catch(() => setProveedores([]));
  }, []);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setEventos(
        await listHistorial({
          tipo: tipo || undefined,
          obraId: obraId || undefined,
          proveedorId: proveedorId || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
    } catch {
      setErrorMessage("No se pudo cargar el historial.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, obraId, proveedorId, from, to]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Historial</h2>
        <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
          Registro cronologico de pedidos, pagos a contratistas y abonos a proveedores, con fecha, hora y quien lo
          hizo.
        </p>
      </div>

      <div className="bg-surface-container lux-card-border p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={labelClass}>Tipo</label>
            <select className={selectClass} value={tipo} onChange={(e) => setTipo(e.target.value as HistorialTipo | "")}>
              {TIPO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Obra</label>
            <select className={selectClass} value={obraId} onChange={(e) => setObraId(e.target.value)}>
              <option value="">Todas</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Proveedor</label>
            <select className={selectClass} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Desde</label>
            <input
              type="date"
              className={selectClass}
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Hasta</label>
            <input
              type="date"
              className={selectClass}
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
      {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

      {!isLoading && eventos.length === 0 && (
        <div className="border border-outline-variant bg-surface p-8 text-center">
          <p className="text-on-surface-variant font-label-sm uppercase">Sin eventos para mostrar.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!isLoading &&
          eventos.map((evento) => {
            const meta = TIPO_META[evento.tipo];
            const fecha = new Date(evento.createdAt);
            return (
              <div
                key={evento.id}
                className="border border-outline-variant bg-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-center gap-3 sm:w-48 shrink-0">
                  <span className={`material-symbols-outlined ${meta.color}`}>{meta.icon}</span>
                  <div>
                    <p className={`font-label-sm uppercase ${meta.color}`}>{meta.label}</p>
                    <p className="font-label-sm text-on-surface-variant/70">
                      {fecha.toLocaleDateString("es-CO")}{" "}
                      {fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-on-surface">{evento.descripcion}</p>
                  {evento.userName && (
                    <p className="font-label-sm text-on-surface-variant/70 uppercase mt-1">Por {evento.userName}</p>
                  )}
                </div>

                {evento.monto !== null && (
                  <div className="font-body-md font-semibold text-primary sm:text-right shrink-0">
                    {currencyFormatter.format(evento.monto)}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
