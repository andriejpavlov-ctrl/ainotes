"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Bell, Trash2, Check, X } from "lucide-react";

export default function ReminderDialog({
  noteId,
  anchorText,
  onClose,
}: {
  noteId: string;
  anchorText: string | null;
  onClose: () => void;
}) {
  const reminders = useStore((s) => s.reminders.filter((r) => r.note_id === noteId));
  const createReminder = useStore((s) => s.createReminder);
  const toggleReminderDone = useStore((s) => s.toggleReminderDone);
  const deleteReminder = useStore((s) => s.deleteReminder);

  // По умолчанию — через час.
  const defaultWhen = format(new Date(Date.now() + 3600_000), "yyyy-MM-dd'T'HH:mm");
  const [when, setWhen] = useState(defaultWhen);
  const [label, setLabel] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!when) return;
    await createReminder(noteId, new Date(when).toISOString(), label, anchorText);
    setLabel("");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-[var(--panel)] p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <Bell size={18} className="text-[var(--accent)]" /> Напоминания
          </h3>
          <button onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        {anchorText && (
          <p className="mb-3 rounded-lg bg-accent-soft p-2 text-sm">
            К фрагменту: «{anchorText.slice(0, 120)}»
          </p>
        )}

        <form onSubmit={add} className="space-y-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Текст напоминания (необязательно)"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
          <button type="submit" className="w-full rounded-lg bg-[var(--accent)] py-2 font-medium text-black hover:brightness-105">
            Добавить напоминание
          </button>
        </form>

        {reminders.length > 0 && (
          <ul className="mt-4 space-y-1">
            {reminders
              .slice()
              .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
              .map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5">
                  <button onClick={() => toggleReminderDone(r.id)} aria-label="Отметить" className={`flex h-5 w-5 items-center justify-center rounded border ${r.done ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--border)]"}`}>
                    {r.done && <Check size={12} />}
                  </button>
                  <div className={`flex-1 ${r.done ? "text-[var(--muted)] line-through" : ""}`}>
                    <div>{r.label || r.anchor_text?.slice(0, 60) || "Напоминание"}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {format(new Date(r.remind_at), "d MMM, HH:mm", { locale: ru })}
                    </div>
                  </div>
                  <button onClick={() => deleteReminder(r.id)} aria-label="Удалить">
                    <Trash2 size={14} className="text-[var(--muted)] hover:text-red-500" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
