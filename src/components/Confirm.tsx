"use client";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/Icons";

/**
 * Confirm-first result gate.
 *
 * Tools keep computing while the visitor types (so pressing the button is
 * instant), but the result stays hidden until it is explicitly confirmed. The
 * gate compares an input signature: while the signature matches the confirmed
 * one, the revealed result follows background refreshes; as soon as an input
 * changes the result is hidden again and must be confirmed once more.
 */
export function useConfirmGate(signature: string, valid: boolean) {
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const revealed = confirmed !== null && confirmed === signature && valid;
  const awaiting = !revealed && valid;
  const needsInput = !valid;

  const confirm = useCallback(() => {
    if (valid) setConfirmed(signature);
  }, [signature, valid]);

  const reset = useCallback(() => setConfirmed(null), []);

  return { revealed, awaiting, needsInput, confirm, reset, hasEverConfirmed: confirmed !== null };
}

export type ConfirmState = "revealed" | "awaiting" | "needs-input" | "invalid";

/**
 * Confirmation row: the action the visitor must take, plus a text status that
 * never discloses the pending value.
 */
export function ConfirmBar({
  action = "Convert",
  state,
  onConfirm,
  onReset,
  disabled = false,
  hint,
  errorText,
  readyText = "Processed — press the button to show the result.",
  shownText = "Result shown.",
  id,
}: {
  action?: string;
  state: ConfirmState;
  onConfirm: () => void;
  onReset?: () => void;
  disabled?: boolean;
  hint?: string;
  errorText?: string;
  readyText?: string;
  shownText?: string;
  id?: string;
}) {
  const statusId = id ? `${id}-status` : undefined;
  const message =
    state === "revealed" ? shownText
      : state === "awaiting" ? readyText
        : state === "needs-input" ? (hint ?? "Enter the values, then confirm.")
          : (errorText ?? "Check the values, then confirm.");

  return (
    <div className="confirm-bar">
      <button
        type="submit"
        className="btn btn-primary"
        onClick={(event) => { event.preventDefault(); onConfirm(); }}
        disabled={disabled || state === "needs-input" || state === "invalid"}
        aria-describedby={statusId}
      >
        <Icon name="check" size={17} strokeWidth={2.6} />
        {action}
      </button>

      {onReset && state === "revealed" && (
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          Hide result
        </button>
      )}

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={`confirm-status ${state === "awaiting" ? "is-ready" : ""} ${
          state === "invalid" || state === "needs-input" ? "is-muted" : ""
        }`}
      >
        {state === "awaiting" && <span className="confirm-dot" aria-hidden />}
        {message}
      </p>
    </div>
  );
}

/** Form wrapper so Enter in any field performs the confirmation action. */
export function ConfirmForm({
  onSubmit,
  children,
  className = "",
  label,
}: {
  onSubmit: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <form
      className={className}
      aria-label={label}
      onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(); }}
      noValidate
    >
      {children}
    </form>
  );
}

/** Placeholder shown in place of a result that has not been confirmed yet. */
export function LockedResult({ label = "Press the button to show the result" }: { label?: string }) {
  return (
    <span className="locked-result">
      <span className="locked-bars" aria-hidden="true"><i /><i /><i /></span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
