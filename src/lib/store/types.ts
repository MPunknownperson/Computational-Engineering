/**
 * Row shapes for the in-process store.
 *
 * The site runs database-free: everything below lives in the runtime memory of
 * the worker/instance that serves the request. Nothing is persisted, nothing is
 * shared across isolates, and every collection is bounded so an instance can
 * never grow without limit. This is what makes the project deployable to
 * Cloudflare Workers and Pages, where no TCP database client is available.
 */

export type JobKind =
  | "shell"
  | "extract"
  | "compress"
  | "install"
  | "upload"
  | "scaffold"
  | "delete"
  | string;

export interface Job {
  id: string;
  kind: JobKind;
  label: string;
  command: string | null;
  cwd: string | null;
  status: "running" | "succeeded" | "failed" | "blocked" | string;
  exitCode: number | null;
  stdout: string | null;
  stderr: string | null;
  durationMs: number | null;
  bytesWritten: number | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
  finishedAt: Date | null;
}

export interface ToolRow {
  id: string;
  name: string;
  binary: string;
  category: string;
  purpose: string;
  packages: { apt?: string; apk?: string; dnf?: string; npm?: string };
  status: "installed" | "missing" | "unknown" | string;
  version: string | null;
  path: string | null;
  lastCheckedAt: Date | null;
  installedAt: Date | null;
}

export interface Artifact {
  id: string;
  name: string;
  path: string;
  kind: "archive" | "file" | "directory" | string;
  size: number;
  source: "upload" | "extract" | "shell" | "compress" | string;
  detail: string | null;
  createdAt: Date;
}

export interface FormulaRow {
  id: string;
  workspace: string;
  name: string;
  expression: string;
  description: string | null;
  tags: string | null;
  variables: string | null;
  createdAt: Date;
}
export type NewFormula = Omit<FormulaRow, "id" | "createdAt"> & Partial<Pick<FormulaRow, "id" | "createdAt">>;

export interface ContactMessageRow {
  id: string;
  topic: string;
  name: string | null;
  email: string | null;
  message: string;
  createdAt: Date;
}

export interface PrivacyChoiceRow {
  id: string;
  saleSharingOptOut: boolean;
  source: "manual" | "gpc" | string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface CryptoSnapshot {
  id: number;
  assetId: string;
  symbol: string;
  name: string;
  vs: string;
  price: string;
  change24h: number | null;
  change7d: number | null;
  marketCap: string | null;
  volume24h: string | null;
  high24h: string | null;
  low24h: string | null;
  rank: number | null;
  source: string;
  capturedAt: Date;
}

export interface CryptoHistoryEntry {
  id: number;
  assetId: string;
  vs: string;
  days: number;
  points: Array<[number, number]>;
  volumes: Array<[number, number]>;
  source: string;
  fetchedAt: Date;
}

export interface CryptoAlert {
  id: string;
  workspace: string;
  assetId: string;
  symbol: string;
  vs: string;
  condition: "above" | "below" | "change_up" | "change_down" | string;
  threshold: string;
  note: string | null;
  status: "armed" | "triggered" | "disabled" | string;
  triggeredAt: Date | null;
  triggeredPrice: string | null;
  createdAt: Date;
}

export interface CryptoPosition {
  id: string;
  workspace: string;
  assetId: string;
  symbol: string;
  quantity: string;
  costBasis: string;
  vs: string;
  note: string | null;
  createdAt: Date;
}

export interface IncidentReport {
  id: string;
  fingerprint: string;
  origin: "server" | "client" | string;
  category: string;
  severity: "info" | "warning" | "error" | "critical" | string;
  message: string;
  stack: string | null;
  route: string | null;
  userAction: string | null;
  context: Record<string, unknown>;
  occurrences: number;
  status: "open" | "remediated" | "monitoring" | "resolved" | string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface RemediationAction {
  id: string;
  incidentId: string | null;
  fingerprint: string;
  playbook: string;
  plan: Record<string, unknown>;
  outcome: "applied" | "verified" | "failed" | "skipped" | string;
  detail: string | null;
  durationMs: number;
  createdAt: Date;
}

export interface RuntimePatchRow {
  key: string;
  value: unknown;
  reason: string | null;
  expiresAt: Date | null;
  updatedAt: Date;
}

export interface SharedItem {
  id: string;
  deviceId: string;
  title: string | null;
  body: string | null;
  url: string | null;
  kind: string;
  parsed: Record<string, unknown>;
  platform: string;
  createdAt: Date;
}

export interface AppFeedItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: string;
  href: string;
  icon: string;
  weight: number;
  createdAt: Date;
}

export interface AppDevicePrefs {
  deviceId: string;
  engine: string;
  mode: string;
  haptics: boolean;
  platform: string;
  updatedAt: Date;
}

export interface NluInteraction {
  id: number;
  sessionId: string;
  rawText: string;
  normalisedText: string;
  decision: "action" | "clarify" | "rejected" | string;
  domain: string | null;
  opcode: string | null;
  entities: Array<{ type: string; value: string }>;
  slots: Record<string, string | number>;
  confidence: number;
  actionHref: string | null;
  actionLabel: string | null;
  result: string | null;
  blockedCode: string | null;
  blockedReason: string | null;
  contextDomain: string | null;
  trace: Array<Record<string, unknown>>;
  latencyMs: number;
  createdAt: Date;
}

export interface NluRegressionRun {
  id: number;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  failures: Array<Record<string, unknown>>;
  createdAt: Date;
}

export interface VoiceAssociation {
  id: number;
  phrase: string;
  locale: string;
  program: string;
  capability: string | null;
  domain: string | null;
  source: string;
  uses: number;
  createdAt: Date;
  lastUsedAt: Date;
}
