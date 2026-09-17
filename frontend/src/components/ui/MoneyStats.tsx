interface MoneyStatsProps {
  items: { label: string; value: string; emphasize?: boolean }[];
}

export function MoneyStats({ items }: MoneyStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-1 sm:flex sm:gap-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col min-w-0">
          <span className="font-label-sm text-on-surface-variant uppercase tracking-wider truncate">
            {item.label}
          </span>
          <span
            className={`font-body-md normal-case truncate ${item.emphasize ? "text-primary font-semibold" : "text-on-surface"}`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
