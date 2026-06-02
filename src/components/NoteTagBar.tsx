"use client";

import { useState } from "react";
import { type Tag } from "@/lib/types";
import { useStore } from "@/lib/store";
import TagAssignMenu from "./TagAssignMenu";
import { Plus, X } from "lucide-react";

// Компактные теги заметки в одну строку с заголовком (требование №5).
export default function NoteTagBar({ noteId, noteTags }: { noteId: string; noteTags: Tag[] }) {
  const unassignTag = useStore((s) => s.unassignTag);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {noteTags.map((t) => (
        <span
          key={t.id}
          className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full pl-2 pr-1 text-xs font-medium leading-none"
          style={{ backgroundColor: t.color + "1f", color: t.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
          <span className="leading-none">{t.name}</span>
          <button
            onClick={() => unassignTag(noteId, t.id)}
            aria-label="Снять тег"
            className="flex h-4 w-4 items-center justify-center rounded-full opacity-60 hover:opacity-100"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </span>
      ))}

      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-dashed border-line-strong px-2 text-xs leading-none text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus size={12} strokeWidth={2.5} /> Тег
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1.5">
            <TagAssignMenu noteId={noteId} noteTags={noteTags} />
          </div>
        </>
      )}
    </div>
  );
}
