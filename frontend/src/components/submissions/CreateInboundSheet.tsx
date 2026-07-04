"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import type { CreateSubmissionInput } from "@/lib/api/submissions";
import { useCreateSubmission } from "@/lib/hooks/use-create-submission";
import type { SubmissionDetail } from "@/lib/schemas";

import { CloseIcon, PlusIcon } from "./icons";
import { StatusBadge } from "./StatusBadge";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (submission: SubmissionDetail) => void;
};

type FormState = {
  patient_name: string;
  age: string;
  phone: string;
  primary_concern: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  patient_name: "",
  age: "",
  phone: "",
  primary_concern: "",
};

export function CreateInboundSheet({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const create = useCreateSubmission();

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
  }, []);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !create.isPending) {
        resetForm();
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, create.isPending, onClose, resetForm]);

  if (!open) return null;

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleClose() {
    if (!create.isPending) {
      resetForm();
      onClose();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateSubmissionInput = {
      patient_name: form.patient_name.trim(),
      age: Number(form.age),
      phone: form.phone.trim(),
      primary_concern: form.primary_concern.trim(),
    };

    create.mutate(payload, {
      onSuccess: (submission) => {
        resetForm();
        onCreated(submission);
      },
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-inbound-title"
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label="Close new inbound form"
        onClick={handleClose}
        className="absolute inset-0 bg-overlay/25 [animation:fade-in_120ms_ease-out]"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col overflow-hidden border-l border-line bg-surface shadow-2xl [animation:sheet-in_160ms_ease-out]">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              New inbound
            </p>
            <h2 id="create-inbound-title" className="mt-1 text-lg font-semibold">
              Create intake submission
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
            disabled={create.isPending}
          >
            <CloseIcon />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <div className="space-y-5 px-5 py-5">
            <div className="flex items-center justify-between rounded-md border border-line bg-surface-muted px-3 py-2.5">
              <span className="text-sm font-medium">Initial status</span>
              <StatusBadge status="new" />
            </div>

            <TextField
              label="Patient name"
              value={form.patient_name}
              error={errors.patient_name}
              onChange={(value) => updateField("patient_name", value)}
              autoFocus
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
              <TextField
                label="Age"
                type="number"
                min="0"
                max="120"
                value={form.age}
                error={errors.age}
                onChange={(value) => updateField("age", value)}
              />
              <TextField
                label="Phone"
                value={form.phone}
                error={errors.phone}
                onChange={(value) => updateField("phone", value)}
              />
            </div>

            <TextAreaField
              label="Primary concern"
              value={form.primary_concern}
              error={errors.primary_concern}
              onChange={(value) => updateField("primary_concern", value)}
            />
          </div>

          <footer className="mt-auto flex items-center justify-end gap-2 border-t border-line bg-surface-muted/70 px-5 py-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={create.isPending}
              className="rounded-md border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-deep disabled:pointer-events-none disabled:opacity-55"
            >
              <PlusIcon />
              {create.isPending ? "Creating" : "Create inbound"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const age = Number(form.age);

  if (!form.patient_name.trim()) errors.patient_name = "Patient name is required.";
  if (!form.phone.trim()) errors.phone = "Phone is required.";
  if (!form.primary_concern.trim()) {
    errors.primary_concern = "Primary concern is required.";
  }
  if (!Number.isInteger(age) || age < 0 || age > 120) {
    errors.age = "Use a whole number from 0 to 120.";
  }

  return errors;
}

function TextField({
  label,
  value,
  error,
  onChange,
  type = "text",
  autoFocus = false,
  min,
  max,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  autoFocus?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </span>
      <input
        type={type}
        min={min}
        max={max}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm font-medium outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="mt-1.5 w-full resize-none rounded-md border border-line bg-surface px-3 py-2.5 text-sm font-medium leading-6 outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </label>
  );
}
