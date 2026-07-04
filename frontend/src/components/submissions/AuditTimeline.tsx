import { formatFull, formatRelative } from "@/lib/date";
import type { StatusEvent, SubmissionDetail } from "@/lib/schemas";
import { STATUS_CONFIG } from "@/lib/status";

type Props = {
  submission: SubmissionDetail;
  loadingEvents: boolean;
};

export function AuditTimeline({ submission, loadingEvents }: Props) {
  if (loadingEvents) return <TimelineSkeleton />;

  const events = submission.events;

  return (
    <ol className="space-y-4">
      <TimelineItem
        dotClass="bg-neutral"
        title="Submission created"
        detail={STATUS_CONFIG.new.label}
        time={submission.created_at}
        showLine={events.length > 0}
      />
      {events.map((event, index) => (
        <StatusEventItem
          key={event.id}
          event={event}
          showLine={index < events.length - 1}
        />
      ))}
    </ol>
  );
}

function StatusEventItem({
  event,
  showLine,
}: {
  event: StatusEvent;
  showLine: boolean;
}) {
  const target = STATUS_CONFIG[event.to_status];
  const source = STATUS_CONFIG[event.from_status];

  return (
    <TimelineItem
      dotClass={target.dotClass}
      title={`Moved to ${target.label}`}
      detail={`From ${source.label}`}
      time={event.created_at}
      showLine={showLine}
    />
  );
}

function TimelineItem({
  dotClass,
  title,
  detail,
  time,
  showLine,
}: {
  dotClass: string;
  title: string;
  detail: string;
  time: string;
  showLine: boolean;
}) {
  return (
    <li className="grid grid-cols-[14px_1fr] gap-3">
      <div className="relative flex justify-center pt-1">
        <span className={`relative z-10 size-2.5 rounded-full ${dotClass}`} />
        {showLine && <span className="absolute bottom-[-18px] top-4 w-px bg-line" />}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">{title}</p>
          <time
            dateTime={time}
            title={formatFull(time)}
            className="shrink-0 font-mono text-[11px] text-ink-faint"
          >
            {formatRelative(time)}
          </time>
        </div>
        <p className="mt-0.5 text-[13px] text-ink-muted">{detail}</p>
      </div>
    </li>
  );
}

function TimelineSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading audit timeline" className="space-y-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="grid grid-cols-[14px_1fr] gap-3">
          <div className="flex justify-center pt-1">
            <span className="size-2.5 rounded-full bg-skeleton" />
          </div>
          <div
            className="space-y-2"
            style={{ animation: `shimmer 1.4s ease-in-out ${row * 90}ms infinite` }}
          >
            <div className="h-3.5 w-36 rounded bg-skeleton/80" />
            <div className="h-3 w-24 rounded bg-skeleton/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
