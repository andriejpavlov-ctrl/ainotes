import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ANTHROPIC_MODEL, textFromMessage } from "@/lib/anthropic";

export const runtime = "nodejs";

// ИИ-поиск по заметкам (требование №4):
// находит релевантные заметки и выдаёт короткую ИИ-сводку.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { query } = (await req.json()) as { query?: string };
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
  }

  // Кандидаты: сначала по совпадению текста, иначе — недавние заметки,
  // чтобы ИИ мог найти семантически близкие.
  const like = `%${query.replace(/[%_]/g, "")}%`;
  const { data: matched } = await supabase
    .from("notes")
    .select("id, title, content_text, updated_at")
    .is("deleted_at", null)
    .or(`title.ilike.${like},content_text.ilike.${like}`)
    .limit(40);

  let candidates = matched ?? [];
  if (candidates.length < 8) {
    const { data: recent } = await supabase
      .from("notes")
      .select("id, title, content_text, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(40);
    const seen = new Set(candidates.map((c) => c.id));
    for (const r of recent ?? []) {
      if (!seen.has(r.id)) candidates.push(r);
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ summary: "Заметок пока нет.", relevant_ids: [] });
  }

  const context = candidates
    .map(
      (n, i) =>
        `[${i}] id=${n.id}\nЗаголовок: ${n.title || "(без названия)"}\nТекст: ${(
          n.content_text || ""
        ).slice(0, 500)}`,
    )
    .join("\n\n");

  let raw = "";
  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 700,
      system:
        "Ты — помощник по поиску в личных заметках. По запросу пользователя найди релевантные заметки из списка и дай короткую сводку-ответ (2–4 предложения) на русском языке, опираясь только на содержимое заметок. Если ничего не подходит — честно скажи об этом. Отвечай строго в формате JSON.",
      messages: [
        {
          role: "user",
          content: `Запрос: "${query}"\n\nЗаметки:\n${context}\n\nВерни JSON вида {"summary": "...", "relevant_ids": ["id1","id2"]}. В relevant_ids — только id действительно подходящих заметок, по убыванию релевантности (максимум 10).`,
        },
      ],
    });
    raw = textFromMessage(message);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Неизвестная ошибка ИИ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let parsed: { summary: string; relevant_ids: string[] } = {
    summary: raw,
    relevant_ids: [],
  };
  try {
    const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    parsed = JSON.parse(jsonStr);
  } catch {
    // Оставляем сырой текст как сводку.
  }

  // Фильтруем id, оставляя только реально существующие.
  const validIds = new Set(candidates.map((c) => c.id));
  parsed.relevant_ids = (parsed.relevant_ids ?? []).filter((id) => validIds.has(id));

  return NextResponse.json(parsed);
}
