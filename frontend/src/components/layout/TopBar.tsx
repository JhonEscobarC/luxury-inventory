interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="md:hidden flex justify-between items-center px-margin-mobile h-16 fixed top-0 w-full z-50 bg-surface border-b border-outline-variant">
      <button onClick={onMenuClick} className="text-primary active:opacity-70">
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>
      <span className="text-headline-md-mobile tracking-widest text-primary uppercase font-bold">LUXURY</span>
      <div className="w-8 h-8 rounded-full bg-surface-bright border border-outline flex items-center justify-center">
        <span className="material-symbols-outlined text-[20px] text-on-surface">person</span>
      </div>
    </header>
  );
}
