import type { Status } from "@/lib/schemas";
import { STATUS_CONFIG, STATUS_ORDER } from "@/lib/status";

type Props = {
  active: Status | undefined;
  /** Called with the new status, or null for "All". */
  onChange: (status: Status | null) => void;
};

export function FilterTabs({ active, onChange }: Props) {
  const tabs: { value: Status | null; label: string }[] = [
    { value: null, label: "All" },
    ...STATUS_ORDER.map((status) => ({
      value: status,
      label: STATUS_CONFIG[status].label,
    })),
  ];

  return (
    <div
      role="tablist"
      className="flex max-w-full overflow-x-auto rounded-md border border-line bg-surface-control p-0.5"
    >
      {tabs.map(({ value, label }) => {
        const isActive = value === (active ?? null);
        return (
          <button
            key={label}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(value)}
            className={`whitespace-nowrap rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
