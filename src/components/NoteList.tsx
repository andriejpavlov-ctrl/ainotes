"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Pin, Trash2, RotateCcw, X, Search, Sparkles } from "lucide-react";
import type { Note } from "@/lib/types";
import IconButton from "./ui/IconButton";

function snippet(n: Note): string {
  return (n.content_text || "").replace(/\s+/g, " ").trim().slice(0, 100);
}

export default function NoteList() {
  const notes = useStore((s) => s.notes);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const restore = useStore((s) => s.restore);
  const deletePermanent = useStore((s) => s.deletePermanent);
  const emptyArchive = useStore((s) => s.emptyArchive);
  const togglePin = useStore((s) => s.togglePin);
  const softDelete = useStore((s) => s.softDelete);

  const [confirmEmpty, setConfirmEmpty] = useState(false);

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

  function clearSearch() {
    setQuery("");
    setSummary(null);
    setResults([]);
  }

  const list = useMemo(() => {
    const arr = notes.filter((n) => (view === "archive" ? n.deleted_at : !n.deleted_at));
    return arr.sort((a, b) => {
      if (view === "active" && a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, view]);

  const resultNotes = results.map((id) => notes.find((n) => n.id === id)).filter(Boolean) as Note[];

  return (
    <div className="flex h-full flex-col">
      {/* Шапка: поиск */}
      <div className="border-b border-line px-3 py-2.5">
        <form onSubmit={runSearch} className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="эйай поиск по заметкам"
            className="h-control w-full rounded border border-line bg-bg pl-9 pr-16 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          {query && (
            <button type="button" onClick={clearSearch} className="absolute right-9 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="Очистить">
              <X size={15} />
            </button>
          )}
          <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-accent hover:text-accent-strong" aria-label="Искать">
            <Sparkles size={16} />
          </button>
        </form>
      </div>

      {/* эйай-сводка */}
      {(searching || summary !== null) && (
        <div className="border-b border-line bg-accent-soft px-3 py-2.5">
          {searching ? (
            <p className="text-sm text-muted">эйай ищет…</p>
          ) : (
            <div className="text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-accent-strong">
                  <Sparkles size={14} /> эйай-сводка
                </span>
                <button onClick={() => { setSummary(null); setResults([]); }} aria-label="Закрыть" className="text-muted hover:text-ink">
                  <X size={14} />
                </button>
              </div>
              <p className="leading-relaxed text-ink">{summary}</p>
              {resultNotes.length > 0 && (
                <div className="mt-2 space-y-0.5 border-t border-black/5 pt-2">
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

      {/* Заголовок архива */}
      {view === "archive" && (
        <div className="flex h-10 items-center justify-between border-b border-line px-3 text-sm">
          <span className="text-muted">В архиве: {list.length}</span>
          {list.length > 0 &&
            (confirmEmpty ? (
              <span className="flex items-center gap-2">
                <button onClick={() => { emptyArchive(); setConfirmEmpty(false); }} className="font-medium text-danger">Точно удалить всё?</button>
                <button onClick={() => setConfirmEmpty(false)} aria-label="Отмена" className="text-muted hover:text-ink"><X size={14} /></button>
              </span>
            ) : (
              <button onClick={() => setConfirmEmpty(true)} className="flex items-center gap-1 text-danger hover:underline">
                <Trash2 size={14} /> Удалить всё
              </button>
            ))}
        </div>
      )}

      {/* Список */}
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {view === "archive" ? "Архив пуст" : "Заметок нет"}
          </p>
        ) : (
          list.map((n) => (
            <div
              key={n.id}
              onClick={() => select(n.id)}
              className={`group relative cursor-pointer border-b border-line px-3 py-3 transition-colors ${
                selectedId === n.id ? "bg-accent-soft" : "hover:bg-surface2"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                  {n.is_pinned && view === "active" && (
                    <Pin size={12} className="mr-1 inline -translate-y-0.5 fill-accent text-accent" />
                  )}
                  {n.title || "Без названия"}
                </h3>
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  {view === "active" ? (
                    <>
                      <IconButton size="sm" onClick={(e) => { e.stopPropagation(); togglePin(n.id); }} aria-label="Закрепить">
                        <Pin size={15} className={n.is_pinned ? "fill-accent text-accent" : ""} />
                      </IconButton>
                      <IconButton size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); softDelete(n.id); }} aria-label="В архив">
                        <Trash2 size={15} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton size="sm" onClick={(e) => { e.stopPropagation(); restore(n.id); }} aria-label="Восстановить">
                        <RotateCcw size={15} />
                      </IconButton>
                      <IconButton size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); deletePermanent(n.id); }} aria-label="Удалить навсегда">
                        <Trash2 size={15} />
                      </IconButton>
                    </>
                  )}
                </div>
              </div>

              <p className="mt-1 line-clamp-1 text-[13px] text-muted">{snippet(n) || "Нет текста"}</p>

              <div className="mt-1.5 text-[11px] text-muted">
                {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true, locale: ru })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
