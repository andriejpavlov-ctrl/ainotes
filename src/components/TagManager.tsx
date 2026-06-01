"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { TAG_COLORS } from "@/lib/types";
import { Plus, X } from "lucide-react";

export default function TagManager() {
  const tags = useStore((s) => s.tags);
  const activeTagFilter = useStore((s) => s.activeTagFilter);
  const toggleTagFilter = useStore((s) => s.toggleTagFilter);
  const clearTagFilter = useStore((s) => s.clearTagFilter);
  const createTag = useStore((s) => s.createTag);
  const deleteTag = useStore((s) => s.deleteTag);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[2]);

  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await createTag(trimmed, color);
      setName("");
      setAdding(false);
    } catch (err) {
      alert("Не удалось создать тег: " + (err instanceof Error ? err.message : ""));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Теги
        </span>
        <div className="flex items-center gap-2">
          {activeTagFilter.length > 0 && (
            <button onClick={clearTagFilter} className="text-xs text-[var(--accent)]">
              Сбросить
            </button>
          )}
          <button onClick={() => setAdding((v) => !v)} aria-label="Добавить тег" className="text-[var(--muted)] hover:text-[var(--text)]">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="mb-2 rounded-lg border border-[var(--border)] p-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название тега"
            className="mb-2 w-full rounded border border-[var(--border)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="mb-2 flex flex-wrap gap-1">
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
          <button type="submit" disabled={saving} className="w-full rounded bg-[var(--accent)] py-1 text-sm font-medium text-black disabled:opacity-60">
            {saving ? "Создаём…" : "Создать"}
          </button>
        </form>
      )}

      <div className="space-y-0.5">
        {tags.length === 0 && !adding && (
          <p className="px-1 text-xs text-[var(--muted)]">Тегов пока нет</p>
        )}
        {tags.map((t) => {
          const active = activeTagFilter.includes(t.id);
          return (
            <div
              key={t.id}
              className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${active ? "bg-black/5" : "hover:bg-black/5"}`}
            >
              <button
                onClick={() => toggleTagFilter(t.id)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                <span className={`truncate ${active ? "font-medium" : ""}`}>{t.name}</span>
              </button>
              <button
                onClick={() => deleteTag(t.id)}
                className="opacity-0 transition group-hover:opacity-100"
                aria-label="Удалить тег"
              >
                <X size={14} className="text-[var(--muted)] hover:text-red-500" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
