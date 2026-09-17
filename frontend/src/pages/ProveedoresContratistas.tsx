import { Link } from "react-router-dom";

const CARDS = [
  {
    to: "/proveedores",
    icon: "local_shipping",
    title: "Proveedores",
    description: "Registra los proveedores disponibles para asignar a los pedidos y controla su deuda.",
  },
  {
    to: "/contratistas",
    icon: "engineering",
    title: "Contratistas",
    description: "Registra los contratistas disponibles para asignarlos a las obras junto a sus etapas de pago.",
  },
];

export function ProveedoresContratistas() {
  return (
    <div>
      <div className="mb-12">
        <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">
          Proveedores y contratistas
        </h2>
        <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
          Elige a donde quieres ir.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="bg-surface-container lux-card-border p-8 flex flex-col items-center text-center gap-4 hover:border-primary transition-colors group"
          >
            <span className="material-symbols-outlined text-5xl text-primary">{card.icon}</span>
            <h3 className="text-headline-md-mobile text-on-surface uppercase group-hover:text-primary transition-colors">
              {card.title}
            </h3>
            <p className="font-body-md text-on-surface-variant">{card.description}</p>
            <span className="font-label-sm uppercase text-primary flex items-center gap-1 mt-2">
              Entrar
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
