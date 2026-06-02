"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Pin, Trash2, RotateCcw } from "lucide-react";
import type { Note } from "@/lib/types";
import IconButton from "./ui/IconButton";

function snippet(n: Note): string {
  return (n.content_text || "").replace(/\s+/g, " ").trim().slice(0, 100);
}

export default function NoteList() {
  const notes = useStore((s) => s.notes);
  const view = useStore((s) => s.view);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const restore = useStore((s) => s.restore);
  const deletePermanent = useStore((s) => s.deletePermanent);
  const emptyArchive = useStore((s) => s.emptyArchive);
  const togglePin = useStore((s) => s.togglePin);
  const softDelete = useStore((s) => s.softDelete);
  const renameNote = useStore((s) => s.renameNote);

  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  function startRename(id: string, title: string) {
    setEditingId(id);
    setEditTitle(title);
  }
  function commitRename() {
    if (editingId) renameNote(editingId, editTitle.trim());
    setEditingId(null);
  }

  const list = useMemo(() => {
    const arr = notes.filter((n) => (view === "archive" ? n.deleted_at : !n.deleted_at));
    return arr.sort((a, b) => {
      if (view === "active" && a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, view]);

  return (
    <div className="flex h-full flex-col">
      {/* Заголовок архива */}
      {view === "archive" && (
        <div className="flex h-11 items-center justify-between border-b border-line px-4 text-sm">
          <span className="text-muted">В архиве: {list.length}</span>
          {list.length > 0 &&
            (confirmEmpty ? (
              <span className="flex items-center gap-2">
                <span className="text-muted">Удалить всё?</span>
                <button onClick={() => { emptyArchive(); setConfirmEmpty(false); }} className="rounded bg-danger px-2.5 py-1 text-xs font-medium text-white hover:opacity-90">
                  Да
                </button>
                <button onClick={() => setConfirmEmpty(false)} className="rounded border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface2">
                  Нет
                </button>
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
              className={`group relative cursor-pointer border-b border-line px-4 py-3 transition-colors ${
                selectedId === n.id ? "bg-accent-soft" : "hover:bg-surface2"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {editingId === n.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="min-w-0 flex-1 rounded border border-accent bg-surface px-1.5 py-0.5 text-[15px] font-medium outline-none"
                  />
                ) : (
                  <h3
                    onClick={view === "active" ? (e) => { e.stopPropagation(); startRename(n.id, n.title); } : undefined}
                    title={view === "active" ? "Нажмите, чтобы переименовать" : undefined}
                    className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink"
                  >
                    {n.is_pinned && view === "active" && (
                      <Pin size={12} className="mr-1 inline -translate-y-0.5 fill-accent text-accent" />
                    )}
                    {n.title || "Без названия"}
                  </h3>
                )}
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
