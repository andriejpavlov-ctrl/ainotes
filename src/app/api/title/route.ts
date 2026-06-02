import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, createMessage, textFromMessage } from "@/lib/anthropic";

export const runtime = "nodejs";

// Автогенерация короткого заголовка заметки по её содержимому.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { text } = (await req.json()) as { text?: string };
  if (!text || text.trim().length < 5) {
    return NextResponse.json({ error: "Мало текста" }, { status: 400 });
  }

  try {
    const anthropic = getAnthropic();
    const message = await createMessage(anthropic, {
      max_tokens: 40,
      system:
        "Придумай короткий заголовок для заметки (2–5 слов) на языке текста. Ответь ТОЛЬКО заголовком, без кавычек, без точки в конце, без пояснений.",
      messages: [{ role: "user", content: text.slice(0, 2000) }],
    });
    let title = textFromMessage(message).replace(/^["'«»\s]+|["'«».\s]+$/g, "").slice(0, 80);
    return NextResponse.json({ title });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка ИИ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
