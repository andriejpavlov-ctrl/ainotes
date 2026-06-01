"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { TAG_COLORS, type Tag } from "@/lib/types";
import { Plus, Check, X } from "lucide-react";

// Панель тегов заметки под заголовком (требование №5):
// присвоить/снять существующий тег и создать новый с выбором цвета.
export default function NoteTagBar({ noteId, noteTags }: { noteId: string; noteTags: Tag[] }) {
  const tags = useStore((s) => s.tags);
  const assignTag = useStore((s) => s.assignTag);
  const unassignTag = useStore((s) => s.unassignTag);
  const createTag = useStore((s) => s.createTag);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[2]);

  const noteTagIds = new Set(noteTags.map((t) => t.id));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    try {
      const tag = await createTag(trimmed, color);
      if (tag) await assignTag(noteId, tag.id);
    } catch (err) {
      alert("Не удалось создать тег: " + (err instanceof Error ? err.message : ""));
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-2">
      {noteTags.map((t) => (
        <span key={t.id} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: t.color + "22", color: t.color }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
          {t.name}
          <button onClick={() => unassignTag(noteId, t.id)} aria-label="Снять тег" className="hover:opacity-70">
            <X size={12} />
          </button>
        </span>
      ))}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Plus size={12} /> Тег
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-4 top-full z-40 mt-1 w-64 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-xl">
            {/* Существующие теги */}
            {tags.length > 0 && (
              <div className="mb-2 max-h-40 space-y-0.5 overflow-y-auto">
                {tags.map((t) => {
                  const on = noteTagIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => (on ? unassignTag(noteId, t.id) : assignTag(noteId, t.id))}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5"
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${on ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--border)]"}`}>
                        {on && <Check size={12} />}
                      </span>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="flex-1 truncate text-left">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Создать новый тег с цветом */}
            <form onSubmit={handleCreate} className="border-t border-[var(--border)] pt-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Новый тег"
                className="mb-2 w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
              />
              <div className="mb-2 flex flex-wrap gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-5 w-5 rounded-full ${color === c ? "ring-2 ring-offset-1 ring-black/40" : ""}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Цвет ${c}`}
                  />
                ))}
              </div>
              <button type="submit" className="w-full rounded-lg bg-[var(--accent)] py-1.5 text-sm font-medium text-black hover:brightness-105">
                Создать и присвоить
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
