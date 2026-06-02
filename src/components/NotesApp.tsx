"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import ListColumn from "./ListColumn";
import NoteEditor from "./NoteEditor";
import SearchOverlay from "./SearchOverlay";

export default function NotesApp({ userId }: { userId: string; email: string }) {
  const init = useStore((s) => s.init);
  const loading = useStore((s) => s.loading);
  const selectedId = useStore((s) => s.selectedId);
  const reminders = useStore((s) => s.reminders);
  const notes = useStore((s) => s.notes);
  const setOnline = useStore((s) => s.setOnline);
  const setSearchOpen = useStore((s) => s.setSearchOpen);

  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    init(userId);
  }, [init, userId]);

  // Горячая клавиша ⌘K / Ctrl+K — открыть поиск.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  // Отслеживаем наличие сети для индикатора синхронизации.
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setOnline]);

  // Напоминания (требование №8): просим разрешение и проверяем срабатывание.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const r of reminders) {
        if (r.done || firedRef.current.has(r.id)) continue;
        if (new Date(r.remind_at).getTime() <= now) {
          firedRef.current.add(r.id);
          const note = notes.find((n) => n.id === r.note_id);
          const title = note?.title || "Заметка";
          const body = r.label || r.anchor_text || "Напоминание о заметке";
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`⏰ ${title}`, { body });
          } else {
            alert(`⏰ Напоминание: ${title}\n${body}`);
          }
        }
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [reminders, notes]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg)]">
      {/* Список заметок (на мобильном скрывается, когда открыт редактор). */}
      <div
        className={`w-full flex-col border-r border-[var(--border)] bg-[var(--panel)] md:flex md:w-96 md:shrink-0 ${
          selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        <ListColumn />
      </div>

      {/* Редактор. */}
      <div className={`flex-1 ${selectedId ? "flex" : "hidden md:flex"} flex-col bg-[var(--bg)]`}>
        {selectedId ? (
          <NoteEditor key={selectedId} noteId={selectedId} />
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            Загрузка…
          </div>
        ) : (
          <div className="hidden h-full flex-col items-center justify-center text-[var(--muted)] md:flex">
            <div className="text-5xl">📝</div>
            <p className="mt-3">Выберите заметку или создайте новую</p>
          </div>
        )}
      </div>

      <SearchOverlay />
    </div>
  );
}
