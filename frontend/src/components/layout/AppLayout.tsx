import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { NAV_ITEMS } from "./navItems";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col md:flex-row">
      <Sidebar />
      <TopBar onMenuClick={() => setMobileNavOpen(true)} />

      {isMobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-[70] flex">
          <div className="flex-1 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <div className="w-72 bg-surface-container border-l border-outline-variant p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <span className="text-headline-md-mobile text-primary uppercase font-bold">LUXURY</span>
              <button onClick={() => setMobileNavOpen(false)} className="text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-4 px-4 py-3 border-l-2 transition-colors",
                      isActive
                        ? "border-primary bg-surface-container-high text-primary font-semibold"
                        : "border-transparent text-on-surface-variant",
                    ].join(" ")
                  }
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-label-sm uppercase tracking-widest">{item.label}</span>
                </NavLink>
              ))}
              <button
                onClick={logout}
                className="mt-6 flex items-center gap-4 px-4 py-3 text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">logout</span>
                <span className="font-label-sm uppercase tracking-widest">Cerrar sesion</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 md:ml-[280px] pt-20 md:pt-12 px-margin-mobile md:px-margin-desktop pb-24 md:pb-12 max-w-container-max mx-auto w-full">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
