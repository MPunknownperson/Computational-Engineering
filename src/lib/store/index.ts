/**
 * Database-free persistence layer.
 *
 * Quilloryn ships without PostgreSQL (or any other database server) so the
 * whole site can be built and served from Cloudflare Workers and Pages. Every
 * collection below is a bounded, in-process ring buffer: writes are O(1),
 * reads never cross the network, and an isolate that is recycled simply starts
 * again from the seeded defaults.
 */

import type {
  AppDevicePrefs,
  AppFeedItem,
  Artifact,
  ContactMessageRow,
  CryptoAlert,
  CryptoHistoryEntry,
  CryptoPosition,
  CryptoSnapshot,
  FormulaRow,
  IncidentReport,
  Job,
  NluInteraction,
  NluRegressionRun,
  PrivacyChoiceRow,
  RemediationAction,
  RuntimePatchRow,
  SharedItem,
  ToolRow,
  VoiceAssociation,
} from "./types";

export * from "./types";

export type Predicate<T> = (row: T) => boolean;

/** Cheap RFC-4122-ish identifier that works in every runtime (no node:crypto). */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** An append-oriented, bounded in-memory collection. */
export class Collection<T> {
  private rows: T[] = [];
  private sequence = 0;

  constructor(private readonly limit = 500) {}

  /** Next value for collections that model an auto-increment id. */
  nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }

  get size(): number {
    return this.rows.length;
  }

  all(): T[] {
    return this.rows.slice();
  }

  list(predicate?: Predicate<T>): T[] {
    return predicate ? this.rows.filter(predicate) : this.rows.slice();
  }

  find(predicate: Predicate<T>): T | undefined {
    return this.rows.find(predicate);
  }

  count(predicate?: Predicate<T>): number {
    return predicate ? this.rows.reduce((n, row) => (predicate(row) ? n + 1 : n), 0) : this.rows.length;
  }

  insert(row: T): T {
    this.rows.push(row);
    if (this.rows.length > this.limit) this.rows.splice(0, this.rows.length - this.limit);
    return row;
  }

  insertMany(rows: T[]): T[] {
    rows.forEach((row) => this.insert(row));
    return rows;
  }

  update(predicate: Predicate<T>, patch: Partial<T>): T[] {
    const changed: T[] = [];
    this.rows = this.rows.map((row) => {
      if (!predicate(row)) return row;
      const next = { ...row, ...patch } as T;
      changed.push(next);
      return next;
    });
    return changed;
  }

  upsert(predicate: Predicate<T>, create: () => T, patch: Partial<T>): T {
    const existing = this.find(predicate);
    if (existing) return this.update(predicate, patch)[0] ?? existing;
    return this.insert({ ...create(), ...patch } as T);
  }

  remove(predicate: Predicate<T>): T[] {
    const removed = this.rows.filter(predicate);
    this.rows = this.rows.filter((row) => !predicate(row));
    return removed;
  }

  replaceAll(rows: T[]): void {
    this.rows = rows.slice(-this.limit);
  }

  clear(): void {
    this.rows = [];
  }
}

type Store = {
  jobs: Collection<Job>;
  tools: Collection<ToolRow>;
  artifacts: Collection<Artifact>;
  formulas: Collection<FormulaRow>;
  contactMessages: Collection<ContactMessageRow>;
  privacyChoices: Collection<PrivacyChoiceRow>;
  cryptoSnapshots: Collection<CryptoSnapshot>;
  cryptoHistory: Collection<CryptoHistoryEntry>;
  cryptoAlerts: Collection<CryptoAlert>;
  cryptoPositions: Collection<CryptoPosition>;
  incidents: Collection<IncidentReport>;
  remediations: Collection<RemediationAction>;
  runtimePatches: Collection<RuntimePatchRow>;
  sharedItems: Collection<SharedItem>;
  appFeed: Collection<AppFeedItem>;
  appPrefs: Collection<AppDevicePrefs>;
  nluInteractions: Collection<NluInteraction>;
  nluRegressionRuns: Collection<NluRegressionRun>;
  voiceAssociations: Collection<VoiceAssociation>;
};

function createStore(): Store {
  return {
    jobs: new Collection<Job>(400),
    tools: new Collection<ToolRow>(100),
    artifacts: new Collection<Artifact>(300),
    formulas: new Collection<FormulaRow>(1_000),
    contactMessages: new Collection<ContactMessageRow>(200),
    privacyChoices: new Collection<PrivacyChoiceRow>(500),
    cryptoSnapshots: new Collection<CryptoSnapshot>(4_000),
    cryptoHistory: new Collection<CryptoHistoryEntry>(120),
    cryptoAlerts: new Collection<CryptoAlert>(500),
    cryptoPositions: new Collection<CryptoPosition>(500),
    incidents: new Collection<IncidentReport>(400),
    remediations: new Collection<RemediationAction>(400),
    runtimePatches: new Collection<RuntimePatchRow>(200),
    sharedItems: new Collection<SharedItem>(300),
    appFeed: new Collection<AppFeedItem>(100),
    appPrefs: new Collection<AppDevicePrefs>(300),
    nluInteractions: new Collection<NluInteraction>(500),
    nluRegressionRuns: new Collection<NluRegressionRun>(50),
    voiceAssociations: new Collection<VoiceAssociation>(1_000),
  };
}

const globalForStore = globalThis as typeof globalThis & { __quillorynStore?: Store };

/** Single shared store per isolate (survives hot reloads in development). */
export const store: Store = globalForStore.__quillorynStore ?? (globalForStore.__quillorynStore = createStore());

/** True when a durable backing service is configured. Always false: by design
 * this deployment target (Workers/Pages) runs without any database. */
export function isDurableStorageConfigured(): boolean {
  return false;
}
