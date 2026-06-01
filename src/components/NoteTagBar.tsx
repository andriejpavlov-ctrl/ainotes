"use client";

import { useState } from "react";
import { type Tag } from "@/lib/types";
import { useStore } from "@/lib/store";
import TagAssignMenu from "./TagAssignMenu";
import { Plus, X } from "lucide-react";

// Панель тегов заметки под заголовком (требование №5).
export default function NoteTagBar({ noteId, noteTags }: { noteId: string; noteTags: Tag[] }) {
  const unassignTag = useStore((s) => s.unassignTag);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
      {noteTags.map((t) => (
        <span
          key={t.id}
          className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium"
          style={{ backgroundColor: t.color + "1f", color: t.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
          {t.name}
          <button onClick={() => unassignTag(noteId, t.id)} aria-label="Снять тег" className="-mr-0.5 opacity-60 hover:opacity-100">
            <X size={12} strokeWidth={2.5} />
          </button>
        </span>
      ))}

      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus size={12} strokeWidth={2.5} /> Тег
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-4 top-full z-40 mt-1.5 sm:left-6">
            <TagAssignMenu noteId={noteId} noteTags={noteTags} />
          </div>
        </>
      )}
    </div>
  );
}
