import type { Status } from "./schemas";

/** Presentation twin of the backend TRANSITIONS dict. One entry drives
 * the badge, filter tab, action button, and empty-state copy for a
 * status everywhere in the app. Adding a status on the backend means
 * adding exactly one entry here. */
export const STATUS_CONFIG: Record<
  Status,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    /** Button label when this status is offered as a transition target. */
    actionLabel: string;
    actionDescription: string;
    actionClass: string;
    /** Reject is irreversible in this state machine, so it confirms first. */
    actionNeedsConfirm: boolean;
    emptyCopy: string;
  }
> = {
  new: {
    label: "New",
    badgeClass: "bg-neutral-wash text-neutral-strong border-neutral-border",
    dotClass: "bg-neutral",
    actionLabel: "Mark as New",
    actionDescription: "Return the intake to the front of the queue.",
    actionClass: "bg-neutral-strong text-on-accent hover:bg-neutral-deep",
    actionNeedsConfirm: false,
    emptyCopy: "No new submissions — the queue is clear.",
  },
  in_review: {
    label: "In Review",
    badgeClass: "bg-info-wash text-info-strong border-info-border",
    dotClass: "bg-info",
    actionLabel: "Start Review",
    actionDescription: "Claim this inbound for staff review.",
    actionClass: "bg-accent text-on-accent hover:bg-accent-deep",
    actionNeedsConfirm: false,
    emptyCopy: "Nothing in review right now — nice work.",
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-success-wash text-success-strong border-success-border",
    dotClass: "bg-success",
    actionLabel: "Approve",
    actionDescription: "Clear this patient intake to proceed.",
    actionClass: "bg-success-strong text-on-accent hover:bg-success-deep",
    actionNeedsConfirm: false,
    emptyCopy: "No approved submissions yet.",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-danger-wash text-danger-strong border-danger-border",
    dotClass: "bg-danger",
    actionLabel: "Reject",
    actionDescription: "Close this intake as not ready to proceed.",
    actionClass:
      "bg-surface text-danger-strong border border-danger-border hover:bg-danger-wash",
    actionNeedsConfirm: true,
    emptyCopy: "No rejected submissions.",
  },
};

/** Display order for filter tabs. */
export const STATUS_ORDER: Status[] = ["new", "in_review", "approved", "rejected"];
