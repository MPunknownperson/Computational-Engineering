/** Runtime import used only by the optional on-device speech worker. */
declare module "@huggingface/transformers" {
  export function pipeline(
    task: string,
    model: string,
    options?: Record<string, unknown>,
  ): Promise<(input: unknown, options?: Record<string, unknown>) => Promise<{ text?: string }>>;
}
