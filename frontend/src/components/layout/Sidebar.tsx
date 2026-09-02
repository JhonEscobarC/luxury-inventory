import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NAV_ITEMS } from "./navItems";

export function Sidebar() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <aside className="hidden md:flex flex-col py-8 fixed left-0 top-0 h-full w-[280px] z-[60] bg-surface-container border-r border-outline-variant">
      <div className="px-8 mb-12">
        <h1 className="text-headline-md-mobile text-primary uppercase font-bold tracking-widest">LUXURY</h1>
        <p className="font-label-sm text-on-surface-variant uppercase mt-1">Diseno y Construccion</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              [
                "flex items-center gap-4 px-4 py-3 border-l-2 transition-colors duration-300",
                isActive
                  ? "border-primary bg-surface-container-high text-primary font-semibold"
                  : "border-transparent text-on-surface-variant hover:bg-surface-bright hover:text-primary",
              ].join(" ")
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-sm uppercase tracking-widest">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-8">
        <div className="flex items-center gap-3 border-t border-outline-variant pt-6">
          <div className="w-10 h-10 rounded-full bg-surface-bright flex items-center justify-center border border-primary-container">
            <span className="material-symbols-outlined text-primary-container">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-sm text-on-surface uppercase truncate">{user?.name}</p>
            <p className="font-label-sm text-on-surface-variant uppercase text-[10px]">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesion"
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
