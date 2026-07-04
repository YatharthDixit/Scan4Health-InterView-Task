import { ApiError } from "@/lib/api/client";

import { AlertIcon } from "./icons";

type Props = {
  error: unknown;
  onRetry: () => void;
};

export function ErrorState({ error, onRetry }: Props) {
  const detail =
    error instanceof ApiError
      ? error.detail
      : "Something went wrong while loading.";

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full border border-danger-border bg-danger-wash">
        <AlertIcon />
      </div>
      <h2 className="mt-4 text-sm font-semibold">Couldn’t load submissions</h2>
      <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{detail}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-deep"
      >
        Try again
      </button>
    </div>
  );
}
