import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ANTHROPIC_MODEL, textFromMessage } from "@/lib/anthropic";

export const runtime = "nodejs";

type Action = "reformulate" | "shorten" | "expand" | "tone" | "fix" | "custom";

const PROMPTS: Record<Action, string> = {
  reformulate: "Переформулируй текст, сохранив смысл. Сделай его яснее и естественнее.",
  shorten: "Сократи текст, убрав лишние слова, но полностью сохрани смысл.",
  expand: "Разверни текст подробнее, добавив уместные детали, не меняя смысла.",
  tone: "Перепиши текст в более деловом и вежливом тоне.",
  fix: "Исправь орфографические, пунктуационные и грамматические ошибки. Не меняй стиль и смысл.",
  custom: "Выполни инструкцию пользователя над текстом.",
};

// Рерайт выделенного фрагмента (требование №9).
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { text, action, instruction } = (await req.json()) as {
    text?: string;
    action?: Action;
    instruction?: string;
  };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
  }

  const act: Action = action && PROMPTS[action] ? action : "reformulate";
  const task =
    act === "custom" && instruction ? instruction : PROMPTS[act];

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system:
        "Ты — редактор текста. Выполняй задание над присланным фрагментом и возвращай ТОЛЬКО переработанный текст без пояснений, кавычек и Markdown-обёрток. Сохраняй язык оригинала.",
      messages: [
        {
          role: "user",
          content: `Задание: ${task}\n\nТекст:\n${text}`,
        },
      ],
    });
    return NextResponse.json({ result: textFromMessage(message) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Неизвестная ошибка ИИ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
