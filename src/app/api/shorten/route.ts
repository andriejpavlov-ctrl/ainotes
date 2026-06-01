import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, createMessage, textFromMessage } from "@/lib/anthropic";

export const runtime = "nodejs";

// Сокращение всей заметки в стиле «Главред» (требование №10):
// убрать лишние слова, сохранить смысл, исправить орфографию и пунктуацию.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { text } = (await req.json()) as { text?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
  }

  try {
    const anthropic = getAnthropic();
    const message = await createMessage(anthropic, {
      max_tokens: 2000,
      system:
        "Ты — редактор в духе сервиса «Главред». Очисти текст от словесного мусора, штампов и канцелярита, убери лишние слова, но полностью сохрани смысл и факты. Исправь орфографические и пунктуационные ошибки. Сохраняй структуру абзацев (разделяй их пустой строкой) и язык оригинала. Верни ТОЛЬКО готовый текст без пояснений.",
      messages: [{ role: "user", content: text }],
    });
    return NextResponse.json({ result: textFromMessage(message) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Неизвестная ошибка ИИ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
