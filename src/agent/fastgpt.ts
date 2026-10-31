import "server-only";

/**
 * FastGPT integration (server side).
 *
 * FastGPT exposes an OpenAI-compatible endpoint:
 *   POST {FASTGPT_BASE_URL}/api/v1/chat/completions
 *   Authorization: Bearer {FASTGPT_API_KEY}
 *   { appId?, chatId, stream:false, detail:false, variables, messages }
 *
 * `chatId` makes FastGPT keep the conversation context itself; only the last
 * user message is read as the new question. We use the caller's session id as
 * `chatId`, so FastGPT's context and our LlamaIndex memory stay aligned.
 * `variables` carry the structured system context (recognised text, engine,
 * the deterministic decision and the retrieved site pages) into the FastGPT
 * workflow where it can be referenced by the app's prompt nodes.
 *
 * Secrets never reach the browser: only this module reads them.
 */

export interface FastGptComprehension {
  reply: string;
  chatId: string;
  provider: "fastgpt";
  usage?: Record<string, unknown>;
}

export interface FastGptContext {
  engine: string;
  heard: string;
  decision: Record<string, unknown>;
  history: Array<{ role: string; content: string }>;
  sitePages: Array<{ path: string; label: string }>;
  locale?: string;
}

function baseUrl(): string | null {
  const raw = process.env.FASTGPT_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
}

export function fastGptConfigured(): boolean {
  return !!(process.env.FASTGPT_API_KEY?.trim() && baseUrl());
}

/** Client-visible widget settings (share link + loader script). */
export function fastGptWidgetConfig(): { scriptSrc: string; botSrc: string } | null {
  const botSrc = process.env.NEXT_PUBLIC_FASTGPT_BOT_SRC?.trim();
  if (!botSrc) return null;
  let scriptSrc = process.env.NEXT_PUBLIC_FASTGPT_SCRIPT_SRC?.trim();
  if (!scriptSrc) {
    try { scriptSrc = `${new URL(botSrc).origin}/js/iframe.js`; } catch { return null; }
  }
  return { scriptSrc, botSrc };
}

interface CompletionResponse {
  id?: string;
  choices?: Array<{ message?: { role?: string; content?: string } }>;
  usage?: Record<string, unknown>;
  responseData?: unknown;
}

/**
 * Ask FastGPT to comprehend the current turn in the light of the full system
 * context. Returns null when FastGPT is not configured or does not answer in
 * time; callers must treat it as optional enrichment.
 */
export async function comprehendWithFastGpt(sessionId: string, question: string, context: FastGptContext, timeoutMs = 12_000): Promise<FastGptComprehension | null> {
  const root = baseUrl();
  const apiKey = process.env.FASTGPT_API_KEY?.trim();
  if (!root || !apiKey) return null;
  const chatId = `rl-${sessionId}`.slice(0, 240);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const systemContext = [
      `Speech engine: ${context.engine}`,
      `Recognised text: ${context.heard}`,
      `Deterministic decision: ${JSON.stringify(context.decision)}`,
      context.sitePages.length ? `Relevant site pages: ${context.sitePages.map((page) => `${page.label} (${page.path})`).join("; ")}` : "",
      context.history.length ? `Recent turns:\n${context.history.map((turn) => `- ${turn.role}: ${turn.content}`).join("\n")}` : "",
    ].filter(Boolean).join("\n");
    const body: Record<string, unknown> = {
      chatId,
      stream: false,
      detail: false,
      variables: {
        engine: context.engine,
        heard: context.heard,
        decision: JSON.stringify(context.decision),
        sitePages: JSON.stringify(context.sitePages),
        locale: context.locale ?? "en",
        systemContext,
      },
      messages: [{ role: "user", content: question }],
    };
    const appId = process.env.FASTGPT_APP_ID?.trim();
    if (appId) body.appId = appId;
    const response = await fetch(`${root}/api/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as CompletionResponse;
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;
    return { reply: reply.slice(0, 2_000), chatId, provider: "fastgpt", usage: data.usage };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
