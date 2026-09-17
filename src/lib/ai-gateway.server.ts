const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

export class AiGatewayError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Calls the Lovable AI Gateway Responses API with a strict JSON schema and
 * returns the parsed structured object. Always streams (reasoning models can
 * run for minutes; buffered calls die on request timeouts).
 */
export async function generateStructured<T>(options: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiGatewayError("Missing LOVABLE_API_KEY", 401);

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: options.instructions,
      input: options.input,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          strict: true,
          schema: options.schema,
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    let message = detail;
    try {
      message = JSON.parse(detail)?.error?.message ?? detail;
    } catch {
      /* keep raw text */
    }
    if (res.status === 429) message = message || "Too many requests right now. Please try again shortly.";
    if (res.status === 402) message = message || "AI credits are exhausted. Add credits to continue.";
    throw new AiGatewayError(message || `AI request failed (${res.status})`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload);
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.type === "response.completed" && !text) {
          text = event.response?.output_text ?? "";
        } else if (event.type === "error") {
          throw new AiGatewayError(event.error?.message ?? "AI stream error", 500);
        }
      } catch (err) {
        if (err instanceof AiGatewayError) throw err;
      }
    }
  }

  if (!text.trim()) {
    throw new AiGatewayError("The AI returned an empty result. Please try again.", 500);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiGatewayError("The AI returned an unreadable result. Please try again.", 500);
  }
}

export const strictObject = (
  properties: Record<string, unknown>,
): Record<string, unknown> => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
