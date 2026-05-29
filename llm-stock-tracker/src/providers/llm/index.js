import { createMockLlmProvider } from "./mock.js";
import { createOpenAiLlmProvider } from "./openai.js";

/**
 * Factory: choose openai if OPENAI_API_KEY is set AND config asks for it,
 * otherwise fall back to the deterministic mock provider.
 */
export function createLlmProvider(config) {
  if (config?.llm?.provider === "openai" && process.env.OPENAI_API_KEY) {
    return createOpenAiLlmProvider();
  }
  return createMockLlmProvider();
}
