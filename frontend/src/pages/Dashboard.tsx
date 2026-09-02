import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listProducts } from "../lib/products";
import { listOrdersReport } from "../lib/orders";
import { api } from "../lib/api";

export function Dashboard() {
  const { user } = useAuth();
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [whatsappConfigured, setWhatsappConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    listProducts().then((result) => setTotalProducts(result.total));
    api.get<{ count: number }>("/products/low-stock-count").then((res) => setLowStockCount(res.data.count));
    listOrdersReport({ status: "PENDIENTE" }).then((orders) => setPendingOrders(orders.length));
    api.get<{ configured: boolean }>("/whatsapp/status").then((res) => setWhatsappConfigured(res.data.configured));
  }, []);

  return (
    <div>
      <div className="mb-12">
        <h2 className="text-display-lg-mobile md:text-display-lg text-on-surface mb-2 tracking-tight">
          Bienvenido, {user?.name}
        </h2>
        <p className="text-body-md md:text-body-lg text-on-surface-variant">
          Sesion iniciada como <span className="text-primary uppercase">{user?.role}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <Link
          to="/inventario"
          className="bg-surface-container p-6 lux-card-border relative overflow-hidden group block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-primary">inventory_2</span>
          </div>
          <p className="font-label-sm text-on-surface-variant uppercase mb-2">Total productos</p>
          <h3 className="text-display-lg-mobile text-on-surface group-hover:text-primary transition-colors">
            {totalProducts ?? "..."}
          </h3>
        </Link>

        <Link
          to="/inventario"
          className="bg-surface-container p-6 lux-card-border relative overflow-hidden group block border-secondary"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-error">warning</span>
          </div>
          <p className="font-label-sm text-on-surface-variant uppercase mb-2">Alertas de stock bajo</p>
          <h3 className="text-display-lg-mobile text-on-surface">{lowStockCount ?? "..."}</h3>
          {lowStockCount != null && lowStockCount > 0 && (
            <div className="flex items-center gap-2 text-error mt-2">
              <span className="material-symbols-outlined text-sm">priority_high</span>
              <span className="font-label-sm">Requiere accion inmediata</span>
            </div>
          )}
        </Link>

        <Link
          to="/pedidos"
          className="bg-surface-container p-6 lux-card-border relative overflow-hidden group block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-primary">assignment</span>
          </div>
          <p className="font-label-sm text-on-surface-variant uppercase mb-2">Pedidos pendientes</p>
          <h3 className="text-display-lg-mobile text-on-surface group-hover:text-primary transition-colors">
            {pendingOrders ?? "..."}
          </h3>
        </Link>
      </div>

      {whatsappConfigured === false && (
        <section>
          <Link
            to="/whatsapp"
            className="flex items-center gap-4 bg-surface-container lux-card-border p-6 hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-3xl text-primary">forum</span>
            <div>
              <p className="font-label-sm text-primary uppercase mb-1">WhatsApp aun no esta conectado</p>
              <p className="font-body-md text-on-surface-variant">
                El webhook y el envio de mensajes estan listos, solo falta cargar las credenciales reales de Meta
                Cloud API en <span className="text-on-surface">backend/.env</span>. Ve al modulo de WhatsApp para mas
                detalle.
              </p>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
