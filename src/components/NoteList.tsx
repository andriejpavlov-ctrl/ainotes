"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Pin, Trash2, RotateCcw, X } from "lucide-react";
import type { Note } from "@/lib/types";

function snippet(n: Note): string {
  return (n.content_text || "").replace(/\s+/g, " ").trim().slice(0, 90);
}

export default function NoteList() {
  const notes = useStore((s) => s.notes);
  const view = useStore((s) => s.view);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const activeTagFilter = useStore((s) => s.activeTagFilter);
  const restore = useStore((s) => s.restore);
  const deletePermanent = useStore((s) => s.deletePermanent);
  const emptyArchive = useStore((s) => s.emptyArchive);
  const togglePin = useStore((s) => s.togglePin);

  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const list = useMemo(() => {
    let arr = notes.filter((n) =>
      view === "archive" ? n.deleted_at : !n.deleted_at,
    );
    if (view === "active" && activeTagFilter.length > 0) {
      arr = arr.filter((n) =>
        activeTagFilter.every((tid) => (n.tags ?? []).some((t) => t.id === tid)),
      );
    }
    // Закреплённые сверху, затем по дате изменения (новые выше).
    return arr.sort((a, b) => {
      if (view === "active" && a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, view, activeTagFilter]);

  return (
    <div className="flex h-full flex-col">
      {view === "archive" && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2 text-sm">
          <span className="font-medium">Архив</span>
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
            {view === "archive" ? "Архив пуст" : "Заметок нет"}
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
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  {view === "active" ? (
                    <button onClick={(e) => { e.stopPropagation(); togglePin(n.id); }} aria-label="Закрепить" className="rounded p-1 hover:bg-black/10">
                      <Pin size={14} className={n.is_pinned ? "fill-[var(--accent)] text-[var(--accent)]" : ""} />
                    </button>
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

              <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                {snippet(n) || "Нет текста"}
              </p>

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
    </div>
  );
}
