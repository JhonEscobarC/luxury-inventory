import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listProducts } from "../lib/products";
import { listOrders } from "../lib/orders";
import { listMyObras } from "../lib/obras";
import { api } from "../lib/api";

export function Dashboard() {
  const { user } = useAuth();
  const isObra = user?.role === "OBRA";

  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [myObrasCount, setMyObrasCount] = useState<number | null>(null);

  useEffect(() => {
    listOrders({ status: "PENDIENTE" }).then((orders) => setPendingOrders(orders.length));
    if (isObra) {
      listMyObras().then((obras) => setMyObrasCount(obras.length));
    } else {
      listProducts().then((result) => setTotalProducts(result.total));
      api.get<{ count: number }>("/products/low-stock-count").then((res) => setLowStockCount(res.data.count));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {isObra ? (
          <>
            <Link
              to="/pedidos"
              className="bg-surface-container p-6 lux-card-border relative overflow-hidden group block"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary">construction</span>
              </div>
              <p className="font-label-sm text-on-surface-variant uppercase mb-2">Mis obras</p>
              <h3 className="text-display-lg-mobile text-on-surface group-hover:text-primary transition-colors">
                {myObrasCount ?? "..."}
              </h3>
            </Link>

            <Link
              to="/pedidos"
              className="bg-surface-container p-6 lux-card-border relative overflow-hidden group block"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary">assignment</span>
              </div>
              <p className="font-label-sm text-on-surface-variant uppercase mb-2">Solicitudes pendientes</p>
              <h3 className="text-display-lg-mobile text-on-surface group-hover:text-primary transition-colors">
                {pendingOrders ?? "..."}
              </h3>
            </Link>
          </>
        ) : (
          <>
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
              <p className="font-label-sm text-on-surface-variant uppercase mb-2">Solicitudes por pasar a compra</p>
              <h3 className="text-display-lg-mobile text-on-surface group-hover:text-primary transition-colors">
                {pendingOrders ?? "..."}
              </h3>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
