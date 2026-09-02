import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NAV_ITEMS } from "./navItems";

export function BottomNav() {
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role))).slice(
    0,
    4,
  );

  return (
    <nav className="md:hidden flex justify-around items-center h-16 px-margin-mobile fixed bottom-0 w-full z-50 bg-surface border-t border-outline-variant">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            [
              "flex flex-col items-center gap-1 p-2 transition-transform active:scale-95",
              isActive ? "text-primary scale-110" : "text-on-surface-variant hover:text-secondary",
            ].join(" ")
          }
        >
          <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
        </NavLink>
      ))}
    </nav>
  );
}
