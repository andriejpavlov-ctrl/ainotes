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

// Кандидаты модели: сначала заданная в env, затем запасные.
// Перебираем по очереди — если модель не найдена (404), пробуем следующую.
const MODEL_CANDIDATES = [
  ANTHROPIC_MODEL,
  "claude-haiku-4-5-20251001",
  "claude-haiku-4-5",
  "claude-3-5-haiku-latest",
  "claude-3-5-sonnet-latest",
  "claude-3-haiku-20240307",
];

function isModelNotFound(e: unknown): boolean {
  if (e instanceof Anthropic.APIError) {
    if (e.status === 404) return true;
    const type = (e.error as { error?: { type?: string } })?.error?.type;
    return type === "not_found_error";
  }
  return false;
}

type CreateParams = Omit<Anthropic.MessageCreateParamsNonStreaming, "model">;

/**
 * Создаёт сообщение, перебирая модели-кандидаты, пока одна не сработает.
 * Это страхует от случая, когда у аккаунта нет доступа к заданной модели.
 */
export async function createMessage(
  client: Anthropic,
  params: CreateParams,
): Promise<Anthropic.Message> {
  let lastError: unknown;
  const tried = new Set<string>();
  for (const model of MODEL_CANDIDATES) {
    if (!model || tried.has(model)) continue;
    tried.add(model);
    try {
      return await client.messages.create({ ...params, model });
    } catch (e) {
      if (isModelNotFound(e)) {
        lastError = e;
        continue; // пробуем следующую модель
      }
      throw e; // другие ошибки (ключ, лимиты) пробрасываем сразу
    }
  }
  throw lastError ?? new Error("Не удалось подобрать доступную модель Claude.");
}

// Достаёт текст из ответа Claude.
export function textFromMessage(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}
