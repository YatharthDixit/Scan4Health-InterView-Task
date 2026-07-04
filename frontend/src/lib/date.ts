/** The only place dates are formatted. The backend speaks UTC ISO-8601;
 * localization to the viewer's locale and timezone happens here. */

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
  style: "narrow",
});

/** "2h ago", "3d ago", "just now" */
export function formatRelative(iso: string): string {
  let delta = (new Date(iso).getTime() - Date.now()) / 1000;
  if (Math.abs(delta) < 10) return "just now";
  for (const division of DIVISIONS) {
    if (Math.abs(delta) < division.amount) {
      return relativeFormatter.format(Math.round(delta), division.unit);
    }
    delta /= division.amount;
  }
  return "";
}

const fullFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** "4 Jul 2026, 3:52 PM" — for tooltips and the detail panel. */
export function formatFull(iso: string): string {
  return fullFormatter.format(new Date(iso));
}
