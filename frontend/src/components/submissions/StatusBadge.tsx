import type { Status } from "@/lib/schemas";
import { STATUS_CONFIG } from "@/lib/status";

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      <span className={`size-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}
