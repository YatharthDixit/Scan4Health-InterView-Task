"use client";

import { useEffect, useRef, useState } from "react";

import { SearchIcon, XIcon } from "./icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const DEBOUNCE_MS = 300;

export function SearchInput({ value, onChange }: Props) {
  const [draftState, setDraftState] = useState(() => ({
    base: value,
    draft: value,
  }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draft = draftState.base === value ? draftState.draft : value;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function handleChange(next: string) {
    setDraftState({ base: value, draft: next });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next.trim()), DEBOUNCE_MS);
  }

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    setDraftState({ base: value, draft: "" });
    onChange("");
  }

  return (
    <div className="relative w-full">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
      <input
        type="text"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search patients…"
        className="h-9 w-full rounded-md border border-line bg-surface pl-8 pr-8 text-[13px] placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint hover:text-ink"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}
