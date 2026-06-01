"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Pin, Trash2, RotateCcw, X, Search, Sparkles, Tag as TagIcon } from "lucide-react";
import type { Note } from "@/lib/types";
import TagPanel from "./TagPanel";

function snippet(n: Note): string {
  return (n.content_text || "").replace(/\s+/g, " ").trim().slice(0, 90);
}

export default function NoteList() {
  const notes = useStore((s) => s.notes);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const activeTagFilter = useStore((s) => s.activeTagFilter);
  const restore = useStore((s) => s.restore);
  const deletePermanent = useStore((s) => s.deletePermanent);
  const emptyArchive = useStore((s) => s.emptyArchive);
  const togglePin = useStore((s) => s.togglePin);
  const softDelete = useStore((s) => s.softDelete);

  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);

  // ИИ-поиск (требование №4) — теперь в области списка.
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  async function runSearch(e: React.FormEvent) {
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
      if (!res.ok) {
        setSummary("ИИ не ответил: " + (data.error || `ошибка ${res.status}`));
      } else {
        setSummary(data.summary ?? "");
        setResults(data.relevant_ids ?? []);
      }
    } catch (err) {
      setSummary("Не удалось связаться с сервером: " + (err instanceof Error ? err.message : ""));
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setSummary(null);
    setResults([]);
  }

  const list = useMemo(() => {
    let arr = notes.filter((n) => (view === "archive" ? n.deleted_at : !n.deleted_at));
    if (view === "active" && activeTagFilter.length > 0) {
      arr = arr.filter((n) =>
        activeTagFilter.every((tid) => (n.tags ?? []).some((t) => t.id === tid)),
      );
    }
    return arr.sort((a, b) => {
      if (view === "active" && a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, view, activeTagFilter]);

  const resultNotes = results
    .map((id) => notes.find((n) => n.id === id))
    .filter(Boolean) as Note[];

  return (
    <div className="flex h-full flex-col">
      {/* Шапка списка: поиск + переключатель + теги */}
      <div className="border-b border-[var(--border)] px-3 py-2">
        <form onSubmit={runSearch} className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ИИ-поиск по заметкам…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2 pl-9 pr-16 text-sm outline-none focus:border-[var(--accent)]"
          />
          {query && (
            <button type="button" onClick={clearSearch} className="absolute right-9 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-label="Очистить">
              <X size={15} />
            </button>
          )}
          <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--accent)]" aria-label="Искать">
            <Sparkles size={16} />
          </button>
        </form>

        <div className="flex items-center justify-between">
          {/* Тонкий переключатель Заметки/Архив */}
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setView("active")}
              className={view === "active" ? "font-semibold text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}
            >
              Заметки
            </button>
            <button
              onClick={() => setView("archive")}
              className={view === "archive" ? "font-semibold text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}
            >
              Архив
            </button>
          </div>

          <button
            onClick={() => setTagPanelOpen(true)}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition hover:bg-black/5 ${
              activeTagFilter.length > 0 ? "text-[var(--accent)]" : "text-[var(--muted)]"
            }`}
          >
            <TagIcon size={14} /> Теги
            {activeTagFilter.length > 0 && (
              <span className="ml-0.5 rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-semibold text-black">
                {activeTagFilter.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ИИ-сводка */}
      {(searching || summary !== null) && (
        <div className="border-b border-[var(--border)] bg-accent-soft px-3 py-2">
          {searching ? (
            <p className="text-sm text-[var(--muted)]">ИИ ищет…</p>
          ) : (
            <div className="text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 font-medium text-[var(--accent)]">
                  <Sparkles size={14} /> ИИ-сводка
                </span>
                <button onClick={() => { setSummary(null); setResults([]); }} aria-label="Закрыть">
                  <X size={14} className="text-[var(--muted)]" />
                </button>
              </div>
              <p className="leading-relaxed">{summary}</p>
              {resultNotes.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-black/5 pt-2">
                  {resultNotes.map((n) => (
                    <button key={n.id} onClick={() => { setView("active"); select(n.id); }} className="block w-full truncate rounded px-2 py-1 text-left hover:bg-black/5">
                      📄 {n.title || "Без названия"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Заголовок архива с «Удалить всё» */}
      {view === "archive" && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2 text-sm">
          <span className="text-[var(--muted)]">В архиве: {list.length}</span>
          {list.length > 0 &&
            (confirmEmpty ? (
              <span className="flex items-center gap-2">
                <button onClick={() => { emptyArchive(); setConfirmEmpty(false); }} className="text-red-600">
                  Точно удалить всё?
                </button>
                <button onClick={() => setConfirmEmpty(false)} aria-label="Отмена">
                  <X size={14} />
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmEmpty(true)} className="flex items-center gap-1 text-red-600 hover:underline">
                <Trash2 size={14} /> Удалить всё
              </button>
            ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--muted)]">
            {view === "archive" ? "Архив пуст" : activeTagFilter.length > 0 ? "Нет заметок с этими тегами" : "Заметок нет"}
          </p>
        ) : (
          list.map((n) => (
            <div
              key={n.id}
              onClick={() => select(n.id)}
              className={`group cursor-pointer border-b border-[var(--border)] px-4 py-3 ${
                selectedId === n.id ? "bg-accent-soft" : "hover:bg-black/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="flex-1 truncate font-medium">
                  {n.is_pinned && view === "active" && (
                    <Pin size={12} className="mr-1 inline -translate-y-0.5 fill-[var(--accent)] text-[var(--accent)]" />
                  )}
                  {n.title || "Без названия"}
                </h3>
                <div className="flex shrink-0 items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  {view === "active" ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); togglePin(n.id); }} aria-label="Закрепить" className="rounded p-1 hover:bg-black/10">
                        <Pin size={14} className={n.is_pinned ? "fill-[var(--accent)] text-[var(--accent)]" : ""} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); softDelete(n.id); }} aria-label="В архив" className="rounded p-1 hover:bg-black/10">
                        <Trash2 size={14} className="text-[var(--muted)] hover:text-red-500" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); restore(n.id); }} aria-label="Восстановить" className="rounded p-1 hover:bg-black/10">
                        <RotateCcw size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deletePermanent(n.id); }} aria-label="Удалить навсегда" className="rounded p-1 hover:bg-black/10">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{snippet(n) || "Нет текста"}</p>

              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">
                  {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true, locale: ru })}
                </span>
                <span className="flex gap-1">
                  {(n.tags ?? []).map((t) => (
                    <span key={t.id} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} title={t.name} />
                  ))}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {tagPanelOpen && <TagPanel onClose={() => setTagPanelOpen(false)} />}
    </div>
  );
}
