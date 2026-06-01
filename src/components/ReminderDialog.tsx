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
        className="w-full max-w-md rounded-t-lg border border-line bg-surface p-5 shadow-pop sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Bell size={18} className="text-accent" /> Напоминания
          </h3>
          <button onClick={onClose} aria-label="Закрыть" className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {anchorText && (
          <p className="mb-3 rounded bg-accent-soft p-2.5 text-sm">
            К фрагменту: «{anchorText.slice(0, 120)}»
          </p>
        )}

        <form onSubmit={add} className="space-y-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="h-control w-full rounded border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Текст напоминания (необязательно)"
            className="h-control w-full rounded border border-line bg-surface px-3 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <button type="submit" className="h-control w-full rounded bg-accent text-sm font-medium text-accent-ink hover:bg-accent-strong">
            Добавить напоминание
          </button>
        </form>

        {reminders.length > 0 && (
          <ul className="mt-4 space-y-1">
            {reminders
              .slice()
              .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
              .map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-surface2">
                  <button onClick={() => toggleReminderDone(r.id)} aria-label="Отметить" className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${r.done ? "border-accent bg-accent text-accent-ink" : "border-line-strong"}`}>
                    {r.done && <Check size={12} strokeWidth={3} />}
                  </button>
                  <div className={`flex-1 ${r.done ? "text-muted line-through" : ""}`}>
                    <div>{r.label || r.anchor_text?.slice(0, 60) || "Напоминание"}</div>
                    <div className="text-xs text-muted">
                      {format(new Date(r.remind_at), "d MMM, HH:mm", { locale: ru })}
                    </div>
                  </div>
                  <button onClick={() => deleteReminder(r.id)} aria-label="Удалить" className="text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
