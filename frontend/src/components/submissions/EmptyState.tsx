import type { Status } from "@/lib/schemas";
import { STATUS_CONFIG } from "@/lib/status";

import { InboxTrayIcon } from "./icons";

type Props = {
  status: Status | undefined;
  search: string;
};

export function EmptyState({ status, search }: Props) {
  const heading = search ? "No matching patients" : "Nothing here";
  const copy = search
    ? `No submissions match “${search}”${status ? ` in ${STATUS_CONFIG[status].label}` : ""}. Try a different name or clear the search.`
    : status
      ? STATUS_CONFIG[status].emptyCopy
      : "No submissions yet. New intake submissions will appear here.";

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full border border-line bg-surface-muted">
        <InboxTrayIcon />
      </div>
      <h2 className="mt-4 text-sm font-semibold">{heading}</h2>
      <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{copy}</p>
    </div>
  );
}
