// Real OpenAI chat-completions LLM provider (global fetch, Node 18+/22).

export function createOpenAiLlmProvider({ apiKey = process.env.OPENAI_API_KEY } = {}) {
  return {
    name: "openai",
    async recommend({ promptText, model } = {}) {
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a market commentator. Name specific tickers and your stance. This is educational only.",
            },
            { role: "user", content: String(promptText || "") },
          ],
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`OpenAI request failed: ${res.status} ${body}`);
      }
      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      return { rawText, model: data?.model || model || "openai" };
    },
  };
}
