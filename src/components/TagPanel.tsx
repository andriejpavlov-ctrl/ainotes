"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { TAG_COLORS } from "@/lib/types";
import { X, Trash2 } from "lucide-react";

// Лёгкое окно управления тегами: создать с цветом и удалить.
export default function TagPanel({ onClose }: { onClose: () => void }) {
  const tags = useStore((s) => s.tags);
  const createTag = useStore((s) => s.createTag);
  const deleteTag = useStore((s) => s.deleteTag);

  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[2]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    try {
      await createTag(trimmed, color);
    } catch (err) {
      alert("Не удалось создать тег: " + (err instanceof Error ? err.message : ""));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[14vh]" onClick={onClose}>
      <div className="w-full max-w-xs rounded-lg border border-line bg-surface p-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Теги</h3>
          <button onClick={onClose} aria-label="Закрыть" className="text-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {/* Создание: строка ввода + палитра + кнопка */}
        <form onSubmit={handleCreate} className="mb-3 flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Новый тег"
            className="h-9 min-w-0 flex-1 rounded border border-line bg-surface px-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="h-9 shrink-0 rounded bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-40"
          >
            Создать
          </button>
        </form>
        <div className="mb-4 flex flex-wrap gap-2">
          {TAG_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full transition ${color === c ? "ring-2 ring-ink/30 ring-offset-1" : ""}`}
              style={{ backgroundColor: c }}
              aria-label={`Цвет ${c}`}
            />
          ))}
        </div>

        {/* Список */}
        {tags.length > 0 && (
          <div className="max-h-56 space-y-0.5 overflow-y-auto border-t border-line pt-2">
            {tags.map((t) => (
              <div key={t.id} className="group flex h-8 items-center gap-2.5 rounded px-1.5 text-sm hover:bg-surface2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="flex-1 truncate">{t.name}</span>
                <button onClick={() => deleteTag(t.id)} className="text-muted opacity-0 transition hover:text-danger group-hover:opacity-100" aria-label="Удалить тег">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
