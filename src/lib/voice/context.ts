/**
 * Stage 4a: conversational context with task typing.
 *
 * Previously the runtime kept only "the last program", so any later number was
 * inherited by the last CONVERT instruction. A maths turn followed by a bare
 * number therefore produced a currency conversion. Context is now typed and
 * time-bounded: a domain only influences the next turn, it never overrides
 * explicit evidence, and inheritance across different domains is forbidden.
 */

export type TaskDomain = "math" | "currency" | "units" | "market" | "navigation";

export interface ContextEntry {
  domain: TaskDomain;
  at: number;
  label: string;
}

/** A context older than this no longer biases interpretation. */
export const CONTEXT_TTL_MS = 3 * 60_000;

/** How strongly a matching recent domain nudges a score (small on purpose). */
export const CONTEXT_BIAS = 0.08;

export class ConversationContext {
  private entries: ContextEntry[] = [];

  constructor(private readonly ttlMs: number = CONTEXT_TTL_MS) {}

  record(domain: TaskDomain, label: string, at: number = Date.now()) {
    this.entries.push({ domain, at, label });
    if (this.entries.length > 20) this.entries.shift();
  }

  /** The most recent domain still inside the time window, if any. */
  recent(now: number = Date.now()): ContextEntry | null {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      if (now - entry.at <= this.ttlMs) return entry;
    }
    return null;
  }

  /** Small additive bias when a reading agrees with the recent task type. */
  bias(domain: TaskDomain, now: number = Date.now()): number {
    const recent = this.recent(now);
    if (!recent) return 0;
    return recent.domain === domain ? CONTEXT_BIAS : -CONTEXT_BIAS / 2;
  }

  /**
   * Ellipsis ("…and 80") may only reuse the previous command when the previous
   * command belongs to the domain that is actually being continued.
   */
  mayInherit(domain: TaskDomain, now: number = Date.now()): boolean {
    const recent = this.recent(now);
    return recent !== null && recent.domain === domain;
  }

  history(): ContextEntry[] {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
  }
}
