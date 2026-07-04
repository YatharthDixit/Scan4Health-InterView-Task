import { formatFull, formatRelative } from "@/lib/date";
import type { Submission } from "@/lib/schemas";

import { StatusBadge } from "./StatusBadge";

type Props = {
  submissions: Submission[];
  selectedId: number | null;
  /** True while showing a previous page as placeholder during a fetch. */
  dimmed: boolean;
  onSelect: (id: number) => void;
};

const HEADER_CELL =
  "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint";

export function QueueTable({ submissions, selectedId, dimmed, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full min-w-[820px] table-fixed text-[13px] transition-opacity ${dimmed ? "opacity-50" : ""}`}
      >
        <thead className="border-b border-line bg-surface-muted/60">
          <tr>
            <th className={`${HEADER_CELL} w-[22%]`}>Patient</th>
            <th className={`${HEADER_CELL} w-[8%]`}>Age</th>
            <th className={HEADER_CELL}>Primary concern</th>
            <th className={`${HEADER_CELL} w-[13%]`}>Status</th>
            <th className={`${HEADER_CELL} w-[12%]`}>Received</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr
              key={submission.id}
              onClick={() => onSelect(submission.id)}
              aria-selected={submission.id === selectedId}
              className={`cursor-pointer border-b border-line last:border-b-0 transition-colors ${
                submission.id === selectedId
                  ? "bg-accent-wash"
                  : "hover:bg-surface-muted"
              }`}
            >
              <td className="truncate px-4 py-3 font-medium">
                {submission.patient_name}
              </td>
              <td className="px-4 py-3 font-mono text-ink-muted">
                {submission.age}
              </td>
              <td
                className="truncate px-4 py-3 text-ink-muted"
                title={submission.primary_concern}
              >
                {submission.primary_concern}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={submission.status} />
              </td>
              <td className="px-4 py-3">
                <time
                  dateTime={submission.created_at}
                  title={formatFull(submission.created_at)}
                  className="font-mono text-xs text-ink-muted"
                >
                  {formatRelative(submission.created_at)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
