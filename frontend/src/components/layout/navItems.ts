import type { Role } from "../../types/auth";

export interface NavItem {
  label: string;
  icon: string;
  to: string;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", to: "/" },
  { label: "Pedidos", icon: "assignment", to: "/pedidos" },
  { label: "Obras", icon: "construction", to: "/obras", roles: ["ADMIN", "CONTABILIDAD"] },
  { label: "Proyectos", icon: "apartment", to: "/proyectos", roles: ["ADMIN", "CONTABILIDAD"] },
  { label: "Proveedores", icon: "local_shipping", to: "/proveedores", roles: ["ADMIN", "CONTABILIDAD"] },
  { label: "Contratistas", icon: "engineering", to: "/contratistas", roles: ["ADMIN", "CONTABILIDAD"] },
  { label: "Inventario", icon: "inventory_2", to: "/inventario", roles: ["ADMIN", "CONTABILIDAD"] },
  { label: "Reportes", icon: "analytics", to: "/reportes", roles: ["ADMIN", "CONTABILIDAD"] },
  { label: "Historial", icon: "history", to: "/historial", roles: ["ADMIN", "CONTABILIDAD"] },
  { label: "Usuarios", icon: "group", to: "/usuarios", roles: ["ADMIN"] },
];
