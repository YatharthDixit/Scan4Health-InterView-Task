/** Shimmer rows that match the real table's column layout, so the swap
 * from loading to loaded doesn't jump. */
export function QueueTableSkeleton({ rows = 8 }: { rows?: number }) {
  const widths = ["w-32", "w-6", "w-4/5", "w-20", "w-12"];
  return (
    <div aria-busy="true" aria-label="Loading submissions">
      <div className="border-b border-line bg-surface-muted/60 px-4 py-3">
        <div className="h-3 w-40 rounded bg-skeleton/70" />
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-6 border-b border-line px-4 py-4 last:border-b-0"
          style={{ animation: `shimmer 1.4s ease-in-out ${row * 90}ms infinite` }}
        >
          {widths.map((width, col) => (
            <div
              key={col}
              className={`h-3.5 rounded bg-skeleton/70 ${width} ${col === 2 ? "flex-1" : "shrink-0"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
