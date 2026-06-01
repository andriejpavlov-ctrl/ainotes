import Anthropic from "@anthropic-ai/sdk";

// Серверный клиент Claude. Ключ доступен только на сервере.
// trim() убирает случайные пробелы/табы, попавшие при вставке в env.
export function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не задан в окружении.");
  }
  return new Anthropic({ apiKey });
}

export const ANTHROPIC_MODEL =
  (process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001").trim() ||
  "claude-haiku-4-5-20251001";

// Достаёт текст из ответа Claude.
export function textFromMessage(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}
