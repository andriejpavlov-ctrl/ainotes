"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { TAG_COLORS } from "@/lib/types";
import { Plus, X, Check, Trash2 } from "lucide-react";

// Окно фильтра и управления тегами (открывается из шапки списка).
export default function TagPanel({ onClose }: { onClose: () => void }) {
  const tags = useStore((s) => s.tags);
  const activeTagFilter = useStore((s) => s.activeTagFilter);
  const toggleTagFilter = useStore((s) => s.toggleTagFilter);
  const clearTagFilter = useStore((s) => s.clearTagFilter);
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
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 pt-16 sm:pt-24" onClick={onClose}>
      <div className="w-80 max-w-[92vw] rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Теги</h3>
          <button onClick={onClose} aria-label="Закрыть">
            <X size={18} className="text-[var(--muted)]" />
          </button>
        </div>

        {/* Создание тега */}
        <form onSubmit={handleCreate} className="mb-3 rounded-xl border border-[var(--border)] p-2">
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
                className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-offset-1 ring-black/40" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={`Цвет ${c}`}
              />
            ))}
          </div>
          <button type="submit" className="w-full rounded-lg bg-[var(--accent)] py-1.5 text-sm font-medium text-black hover:brightness-105">
            Создать тег
          </button>
        </form>

        {/* Фильтр / список */}
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Фильтр по тегам
          </span>
          {activeTagFilter.length > 0 && (
            <button onClick={clearTagFilter} className="text-xs text-[var(--accent)]">
              Сбросить
            </button>
          )}
        </div>

        {tags.length === 0 ? (
          <p className="px-1 py-2 text-sm text-[var(--muted)]">Тегов пока нет</p>
        ) : (
          <div className="max-h-60 space-y-0.5 overflow-y-auto">
            {tags.map((t) => {
              const active = activeTagFilter.includes(t.id);
              return (
                <div key={t.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5">
                  <button onClick={() => toggleTagFilter(t.id)} className="flex flex-1 items-center gap-2 text-left">
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${active ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--border)]"}`}>
                      {active && <Check size={12} />}
                    </span>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className={`truncate ${active ? "font-medium" : ""}`}>{t.name}</span>
                  </button>
                  <button onClick={() => deleteTag(t.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Удалить тег">
                    <Trash2 size={14} className="text-[var(--muted)] hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
