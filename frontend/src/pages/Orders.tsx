import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { assignOrder, createOrder, listOrders, updateOrder, updateOrderStatus } from "../lib/orders";
import { listMyObras, listObras } from "../lib/obras";
import { listProveedores } from "../lib/proveedores";
import { listAllProductsForReport } from "../lib/products";
import type { AssignOrderInput, Order, OrderInput, OrderStatus } from "../types/order";
import type { Obra } from "../types/obra";
import type { Proveedor } from "../types/proveedor";
import type { Product } from "../types/product";
import { OrderFormModal } from "../components/orders/OrderFormModal";
import { AssignOrderModal } from "../components/orders/AssignOrderModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  DESPACHADO: "Despachado",
  CANCELADO: "Cancelado",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDIENTE: "border-primary text-primary",
  CONFIRMADO: "border-tertiary text-tertiary",
  DESPACHADO: "border-secondary text-secondary",
  CANCELADO: "border-error text-error",
};

const STATUS_FILTERS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "DESPACHADO", label: "Despachado" },
  { value: "CANCELADO", label: "Cancelado" },
];

export function Orders() {
  const { user } = useAuth();
  const isObra = user?.role === "OBRA";
  const canAssign = user?.role === "ADMIN" || user?.role === "CONTABILIDAD";

  const [orders, setOrders] = useState<Order[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [pendingTransitionId, setPendingTransitionId] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [ordersResult, obrasResult, proveedoresResult, productsResult] = await Promise.all([
        listOrders({ status: statusFilter || undefined }),
        isObra ? listMyObras() : listObras({ isActive: true }),
        canAssign ? listProveedores({ isActive: true }) : Promise.resolve([]),
        canAssign ? listAllProductsForReport() : Promise.resolve([]),
      ]);
      setOrders(ordersResult);
      setObras(obrasResult);
      setProveedores(proveedoresResult);
      setProducts(productsResult);
    } catch {
      setErrorMessage("No se pudieron cargar los pedidos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleCreate(input: OrderInput) {
    await createOrder(input);
    await refresh();
  }

  async function handleUpdate(input: OrderInput) {
    if (!editingOrder) return;
    await updateOrder(editingOrder.id, { notes: input.notes, items: input.items });
    await refresh();
  }

  async function handleAssign(input: AssignOrderInput) {
    if (!assigningOrder) return;
    await assignOrder(assigningOrder.id, input);
    await refresh();
  }

  async function handleStatusChange(order: Order, nextStatus: OrderStatus) {
    setTransitionError(null);
    setPendingTransitionId(order.id);
    try {
      await updateOrderStatus(order.id, nextStatus);
      await refresh();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo actualizar el estado del pedido.";
      setTransitionError(message);
    } finally {
      setPendingTransitionId(null);
    }
  }

  async function handleCancel() {
    if (!cancelingOrder) return;
    await handleStatusChange(cancelingOrder, "CANCELADO");
    setCancelingOrder(null);
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Pedidos</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            {isObra
              ? "Crea pedidos de materiales para tus obras asignadas."
              : "Gestiona los pedidos entrantes: asigna proveedor, precios y actualiza su estado."}
          </p>
        </div>

        {isObra && (
          <button
            onClick={() => setIsCreating(true)}
            disabled={obras.length === 0}
            className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2 self-start disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo pedido
          </button>
        )}
      </div>

      {isObra && obras.length === 0 && !isLoading && (
        <p className="font-label-sm text-on-surface-variant uppercase mb-6">
          Aun no tienes obras asignadas. Pide a un administrador que te asigne una.
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-8">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`font-label-sm uppercase px-4 py-2 border transition-colors ${
              statusFilter === option.value
                ? "border-primary text-primary"
                : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}
      {transitionError && <p className="text-error font-label-sm uppercase mb-6">{transitionError}</p>}

      {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

      {!isLoading && orders.length === 0 && (
        <div className="border border-outline-variant bg-surface p-8 text-center">
          <p className="text-on-surface-variant font-label-sm uppercase">Sin pedidos para mostrar.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {!isLoading &&
          orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const isOwner = order.createdById === user?.id;
            const canEdit = isObra && isOwner && order.status === "PENDIENTE";
            const canCancel =
              (isObra && isOwner && order.status === "PENDIENTE") ||
              (canAssign && (order.status === "PENDIENTE" || order.status === "CONFIRMADO"));
            const isPending = pendingTransitionId === order.id;

            return (
              <div key={order.id} className="border border-outline-variant bg-surface hover:border-primary transition-colors">
                <div
                  className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-body-md font-semibold text-on-surface">{order.obraName}</span>
                      <span className={`font-label-sm uppercase px-2 py-1 border ${STATUS_CLASS[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                      {order.proveedorName && (
                        <span className="font-label-sm uppercase px-2 py-1 border border-outline-variant text-on-surface-variant">
                          {order.proveedorName}
                        </span>
                      )}
                    </div>
                    <p className="font-label-sm text-on-surface-variant/70 uppercase mt-1">
                      Pedido por {order.createdByName} - {new Date(order.createdAt).toLocaleString("es-CO")}
                    </p>
                  </div>

                  <div className="font-body-md text-on-surface font-semibold">
                    {order.total !== null ? currencyFormatter.format(order.total) : "Sin precio"}
                  </div>

                  <span className="material-symbols-outlined text-on-surface-variant">
                    {isExpanded ? "expand_less" : "expand_more"}
                  </span>
                </div>

                {isExpanded && (
                  <div className="border-t border-outline-variant p-4 md:p-5">
                    <div className="flex flex-col gap-2 mb-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-body-md text-on-surface-variant">
                          <span>
                            {item.description} - {item.quantity} {item.unit}
                            {item.productName && (
                              <span className="font-label-sm text-primary uppercase ml-2">
                                (inventario: {item.productName})
                              </span>
                            )}
                          </span>
                          <span>{item.subtotal !== null ? currencyFormatter.format(item.subtotal) : "Sin precio"}</span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="font-label-sm text-on-surface-variant uppercase mb-4">Notas: {order.notes}</p>
                    )}

                    <div className="flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          onClick={() => setEditingOrder(order)}
                          className="border border-outline-variant text-on-surface-variant font-label-sm uppercase px-4 py-2 hover:border-primary hover:text-primary transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      {canAssign && order.status === "PENDIENTE" && (
                        <button
                          onClick={() => setAssigningOrder(order)}
                          className="border border-primary text-primary font-label-sm uppercase px-4 py-2 hover:bg-primary hover:text-on-primary transition-colors"
                        >
                          Asignar proveedor
                        </button>
                      )}
                      {canAssign && order.status === "CONFIRMADO" && (
                        <button
                          disabled={isPending}
                          onClick={() => handleStatusChange(order, "DESPACHADO")}
                          className="border border-primary text-primary font-label-sm uppercase px-4 py-2 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50"
                        >
                          {isPending ? "Actualizando..." : "Marcar como despachado"}
                        </button>
                      )}
                      {canCancel && (
                        <button
                          disabled={isPending}
                          onClick={() => setCancelingOrder(order)}
                          className="border border-error text-error font-label-sm uppercase px-4 py-2 hover:bg-error hover:text-on-error transition-colors disabled:opacity-50"
                        >
                          Cancelar pedido
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {isCreating && (
        <OrderFormModal order={null} obras={obras} onClose={() => setIsCreating(false)} onSubmit={handleCreate} />
      )}

      {editingOrder && (
        <OrderFormModal
          order={editingOrder}
          obras={obras}
          onClose={() => setEditingOrder(null)}
          onSubmit={handleUpdate}
        />
      )}

      {assigningOrder && (
        <AssignOrderModal
          order={assigningOrder}
          proveedores={proveedores}
          products={products}
          onClose={() => setAssigningOrder(null)}
          onSubmit={handleAssign}
        />
      )}

      {cancelingOrder && (
        <ConfirmDialog
          title="Cancelar pedido"
          message={`¿Seguro que deseas cancelar el pedido de "${cancelingOrder.obraName}"?`}
          confirmLabel="Cancelar pedido"
          onConfirm={handleCancel}
          onCancel={() => setCancelingOrder(null)}
        />
      )}
    </div>
  );
}
