"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Note } from "@/lib/types";
import { Search, Sparkles, X, Loader2, FileText } from "lucide-react";

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
    if (!query.trim()) return;
    setSearching(true);
    setSummary(null);
    setResults([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setSummary("эйай не ответил: " + (data.error || `ошибка ${res.status}`));
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
          <button type="submit" disabled={!query.trim() || searching} className="flex h-8 shrink-0 items-center gap-1.5 rounded bg-accent px-3 text-[13px] font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-40">
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            эйай
          </button>
        </form>

        <div className="max-h-[55vh] overflow-y-auto">
          {/* эйай-сводка */}
          {(searching || summary) && (
            <div className="border-b border-line bg-accent-soft px-4 py-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-accent-strong">
                <Sparkles size={14} /> эйай-сводка
              </div>
              {searching ? <p className="text-muted">эйай ищет…</p> : <p className="leading-relaxed text-ink">{summary}</p>}
            </div>
          )}

          {/* Результаты ИИ */}
          {aiResultNotes.length > 0 && (
            <div className="py-1">
              <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Нашёл эйай</div>
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
              Ничего не найдено. Нажмите «эйай» для умного поиска.
            </p>
          )}

          {!query && (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Введите запрос. Enter — умный поиск с эйай-сводкой.
            </p>
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
