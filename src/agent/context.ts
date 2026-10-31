import "server-only";
import { createMemory, type Memory } from "@llamaindex/core/memory";
import { SentenceSplitter } from "@llamaindex/core/node-parser";
import { Document, MetadataMode, type TextNode } from "@llamaindex/core/schema";
import type { ChatMessage } from "@llamaindex/core/llms";
import { simpleExtractKeywords } from "llamaindex";
import { SEARCH_PAGES, type SearchPage } from "@/lib/search-pages";

/**
 * LlamaIndex-backed system context for the voice/NLU pipeline.
 *
 * Two responsibilities, both local and deterministic (no LLM, no embeddings,
 * no network):
 *
 *  1. Session memory — every recognised utterance and every backend action is
 *     appended to a LlamaIndex `Memory` keyed by the caller's session id. The
 *     memory is what later turns, the LangChain dispatcher are
 *     given as "what has happened so far".
 *
 *  2. Site knowledge — the public page catalog is ingested as LlamaIndex
 *     `Document`s, chunked with `SentenceSplitter` into `TextNode`s and
 *     indexed by a keyword table. Retrieval grounds tool dispatch in pages
 *     that actually exist, so the agent can only ever route to real tools.
 */

const SESSION_TTL_MS = 30 * 60_000;
const MAX_SESSIONS = 500;
const MEMORY_TOKEN_LIMIT = 4_000;

interface SessionRecord {
  memory: Memory;
  touchedAt: number;
}

const sessions = new Map<string, SessionRecord>();

function sweep(now = Date.now()) {
  for (const [key, record] of sessions) {
    if (now - record.touchedAt > SESSION_TTL_MS) sessions.delete(key);
  }
  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort((a, b) => a[1].touchedAt - b[1].touchedAt).slice(0, sessions.size - MAX_SESSIONS);
    for (const [key] of oldest) sessions.delete(key);
  }
}

export function sessionMemory(sessionId: string): Memory {
  sweep();
  const key = sessionId.slice(0, 64) || "anonymous";
  const existing = sessions.get(key);
  if (existing) { existing.touchedAt = Date.now(); return existing.memory; }
  const memory = createMemory({ tokenLimit: MEMORY_TOKEN_LIMIT });
  sessions.set(key, { memory, touchedAt: Date.now() });
  return memory;
}

export type TurnRole = "user" | "assistant" | "system";

/** Append a turn to the session's LlamaIndex memory. */
export async function rememberTurn(sessionId: string, role: TurnRole, content: string, options?: Record<string, unknown>) {
  const memory = sessionMemory(sessionId);
  const message: ChatMessage = { role, content: content.slice(0, 2_000), options };
  await memory.add(message);
}

/** Recent turns for a session (oldest first), as plain text. */
export async function sessionHistory(sessionId: string, limit = 12): Promise<Array<{ role: TurnRole; content: string }>> {
  const memory = sessionMemory(sessionId);
  const messages = await memory.get();
  return messages.slice(-limit).map((message) => ({
    role: (message.role === "assistant" || message.role === "system" ? message.role : "user") as TurnRole,
    content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
  }));
}

export async function forgetSession(sessionId: string) {
  const record = sessions.get(sessionId.slice(0, 64) || "anonymous");
  if (record) { await record.memory.clear(); sessions.delete(sessionId); }
}

/* ------------------------------------------------------------------ */
/* Site knowledge                                                       */
/* ------------------------------------------------------------------ */

export interface SiteContextHit {
  path: string;
  label: string;
  kind: SearchPage["kind"];
  score: number;
  excerpt: string;
}

interface IndexedNode {
  node: TextNode;
  page: SearchPage;
  keywords: Set<string>;
}

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "in", "for", "on", "with", "is", "are", "it", "this", "that", "by", "from", "at", "as", "be", "your", "you", "we", "our", "how", "what", "can", "free", "online"]);

let indexed: IndexedNode[] | null = null;

function buildIndex(): IndexedNode[] {
  if (indexed) return indexed;
  const splitter = new SentenceSplitter({ chunkSize: 96, chunkOverlap: 12 });
  const result: IndexedNode[] = [];
  for (const page of SEARCH_PAGES) {
    const text = [page.label, page.title, page.description, page.formula ?? ""].filter(Boolean).join(". ");
    const document = new Document({ text, id_: page.path, metadata: { path: page.path, label: page.label, kind: page.kind } });
    const nodes = splitter.getNodesFromDocuments([document]);
    for (const node of nodes) {
      const keywords = new Set([...simpleExtractKeywords(node.getContent(MetadataMode.NONE))].filter((word) => word.length > 2 && !STOP.has(word)));
      for (const part of page.path.split("/")) for (const word of part.split("-")) if (word.length > 2) keywords.add(word.toLowerCase());
      result.push({ node, page, keywords });
    }
  }
  indexed = result;
  return result;
}

function queryTerms(text: string): string[] {
  return [...simpleExtractKeywords(text)].filter((word) => word.length > 2 && !STOP.has(word));
}

/** Keyword-table retrieval over the site's LlamaIndex nodes. */
export function retrieveSiteContext(text: string, limit = 4): SiteContextHit[] {
  const terms = queryTerms(text);
  if (!terms.length) return [];
  const scores = new Map<string, SiteContextHit>();
  for (const entry of buildIndex()) {
    let score = 0;
    for (const term of terms) {
      if (entry.keywords.has(term)) score += 1;
      else if ([...entry.keywords].some((keyword) => keyword.startsWith(term) || term.startsWith(keyword))) score += 0.4;
    }
    if (score <= 0) continue;
    const normalised = score / Math.sqrt(terms.length);
    const previous = scores.get(entry.page.path);
    if (!previous || previous.score < normalised) {
      scores.set(entry.page.path, {
        path: entry.page.path,
        label: entry.page.label,
        kind: entry.page.kind,
        score: Number(normalised.toFixed(3)),
        excerpt: entry.node.getContent(MetadataMode.NONE).slice(0, 160),
      });
    }
  }
  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Number of LlamaIndex nodes in the site index (diagnostics). */
export function siteIndexSize(): number {
  return buildIndex().length;
}
