import type { Role } from "../../types/auth";

export interface NavItem {
  label: string;
  icon: string;
  to: string;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", to: "/" },
  { label: "Inventario", icon: "inventory_2", to: "/inventario" },
  { label: "Pedidos", icon: "assignment", to: "/pedidos" },
  { label: "WhatsApp", icon: "forum", to: "/whatsapp" },
  { label: "Reportes", icon: "analytics", to: "/reportes" },
  { label: "Usuarios", icon: "group", to: "/usuarios", roles: ["ADMIN"] },
];
