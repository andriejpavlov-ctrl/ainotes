"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { TAG_COLORS, type Tag } from "@/lib/types";
import { Check, Plus } from "lucide-react";

// Содержимое поповера: присвоить/снять существующий тег и создать новый
// с выбором цвета. Позиционирование и overlay — на стороне вызывающего.
export default function TagAssignMenu({
  noteId,
  noteTags,
}: {
  noteId: string;
  noteTags: Tag[];
}) {
  const tags = useStore((s) => s.tags);
  const assignTag = useStore((s) => s.assignTag);
  const unassignTag = useStore((s) => s.unassignTag);
  const createTag = useStore((s) => s.createTag);

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
    <div className="w-64 rounded-lg border border-line bg-surface p-2.5 shadow-pop">
      {tags.length > 0 && (
        <div className="mb-2 max-h-44 space-y-0.5 overflow-y-auto">
          {tags.map((t) => {
            const on = noteTagIds.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => (on ? unassignTag(noteId, t.id) : assignTag(noteId, t.id))}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-surface2"
              >
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border ${
                    on ? "border-accent bg-accent text-accent-ink" : "border-line-strong"
                  }`}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="flex-1 truncate text-left">{t.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={handleCreate} className={tags.length > 0 ? "border-t border-line pt-2.5" : ""}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новый тег"
          className="mb-2 h-9 w-full rounded border border-line bg-surface px-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {TAG_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full transition ${
                color === c ? "ring-2 ring-ink/30 ring-offset-1" : ""
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Цвет ${c}`}
            />
          ))}
        </div>
        <button
          type="submit"
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded bg-accent text-sm font-medium text-accent-ink hover:bg-accent-strong"
        >
          <Plus size={15} /> Создать и присвоить
        </button>
      </form>
    </div>
  );
}
