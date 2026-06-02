"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Note } from "@/lib/types";
import { Search, Sparkles, X, Loader2, FileText } from "lucide-react";

// Примеры-подсказки возможностей умного поиска.
const SUGGESTIONS = [
  { text: "О чём мои заметки про логистику?", hint: "Короткий ответ-сводка по содержимому" },
  { text: "Найди, где упоминается дедлайн", hint: "Поиск по смыслу, а не только по словам" },
  { text: "Собери все задачи и их статусы", hint: "Соберёт информацию из разных заметок" },
  { text: "Что запланировано на эту неделю?", hint: "Ответит и покажет нужные заметки" },
];

// Раскрывающийся поиск в стиле Spotlight / Windows 11.
export default function SearchOverlay() {
  const open = useStore((s) => s.searchOpen);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const notes = useStore((s) => s.notes);
  const select = useStore((s) => s.select);
  const setView = useStore((s) => s.setView);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Фокус на поле при открытии; Esc — закрыть.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setSearchOpen(false);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, setSearchOpen]);

  if (!open) return null;

  // Быстрые совпадения по заголовку/тексту (мгновенно, без ИИ).
  const q = query.trim().toLowerCase();
  const quick = q
    ? notes
        .filter((n) => !n.deleted_at)
        .filter(
          (n) =>
            (n.title || "").toLowerCase().includes(q) ||
            (n.content_text || "").toLowerCase().includes(q),
        )
        .slice(0, 8)
    : [];

  const aiResultNotes = results
    .map((id) => notes.find((n) => n.id === id))
    .filter(Boolean) as Note[];

  function openNote(id: string) {
    setView("active");
    select(id);
    close();
  }

  function close() {
    setSearchOpen(false);
    setQuery("");
    setSummary(null);
    setResults([]);
  }

  async function runAiSearch(e: React.FormEvent) {
    e.preventDefault();
    await search(query);
  }

  async function search(text: string) {
    if (!text.trim()) return;
    setQuery(text);
    setSearching(true);
    setSummary(null);
    setResults([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setSummary("Не удалось получить ответ: " + (data.error || `ошибка ${res.status}`));
      else {
        setSummary(data.summary ?? "");
        setResults(data.relevant_ids ?? []);
      }
    } catch (err) {
      setSummary("Не удалось связаться с сервером: " + (err instanceof Error ? err.message : ""));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-[2px]" onClick={close}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-line bg-surface shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Поле ввода */}
        <form onSubmit={runAiSearch} className="flex h-14 items-center gap-3 border-b border-line px-4">
          <Search size={20} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по заметкам…"
            className="h-full flex-1 bg-transparent text-base outline-none focus:outline-none focus-visible:outline-none placeholder:text-muted"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setSummary(null); setResults([]); }} className="shrink-0 text-muted hover:text-ink" aria-label="Очистить">
              <X size={18} />
            </button>
          )}
          <button type="submit" disabled={!query.trim() || searching} className="flex h-8 shrink-0 items-center justify-center rounded bg-accent px-4 text-[13px] font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-40">
            {searching ? <Loader2 size={14} className="animate-spin" /> : "эйай"}
          </button>
        </form>

        <div className="max-h-[55vh] overflow-y-auto">
          {/* Сводка */}
          {(searching || summary) && (
            <div className="border-b border-line bg-accent-soft px-4 py-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-accent-strong">
                <Sparkles size={14} /> Сводка
              </div>
              {searching ? <p className="text-muted">Идёт поиск…</p> : <p className="leading-relaxed text-ink">{summary}</p>}
            </div>
          )}

          {/* Результаты ИИ */}
          {aiResultNotes.length > 0 && (
            <div className="py-1">
              <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Подходящие по смыслу</div>
              {aiResultNotes.map((n) => (
                <ResultRow key={n.id} note={n} onClick={() => openNote(n.id)} />
              ))}
            </div>
          )}

          {/* Быстрые совпадения */}
          {query && quick.length > 0 && (
            <div className="py-1">
              <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Совпадения</div>
              {quick.map((n) => (
                <ResultRow key={n.id} note={n} onClick={() => openNote(n.id)} />
              ))}
            </div>
          )}

          {/* Пусто */}
          {query && !searching && quick.length === 0 && aiResultNotes.length === 0 && !summary && (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Совпадений нет. Нажмите Enter для умного поиска.
            </p>
          )}

          {!query && (
            <div className="px-4 py-3">
              <div className="space-y-0.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => search(s.text)}
                    className="flex w-full items-start gap-2.5 rounded px-2 py-2 text-left hover:bg-surface2"
                  >
                    <Sparkles size={15} className="mt-0.5 shrink-0 text-accent" />
                    <span className="min-w-0">
                      <span className="block text-sm text-ink">{s.text}</span>
                      <span className="block text-[12px] text-muted">{s.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ note, onClick }: { note: Note; onClick: () => void }) {
  const snippet = (note.content_text || "").replace(/\s+/g, " ").trim().slice(0, 80);
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-surface2">
      <FileText size={16} className="mt-0.5 shrink-0 text-muted" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{note.title || "Без названия"}</span>
        {snippet && <span className="block truncate text-[13px] text-muted">{snippet}</span>}
      </span>
    </button>
  );
}
