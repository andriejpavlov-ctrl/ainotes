"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import Sidebar from "./Sidebar";
import NoteList from "./NoteList";
import NoteEditor from "./NoteEditor";
import { Menu } from "lucide-react";

export default function NotesApp({ userId }: { userId: string; email: string }) {
  const init = useStore((s) => s.init);
  const loading = useStore((s) => s.loading);
  const selectedId = useStore((s) => s.selectedId);
  const reminders = useStore((s) => s.reminders);
  const notes = useStore((s) => s.notes);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    init(userId);
  }, [init, userId]);

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
            // Фолбэк, если уведомления запрещены.
            alert(`⏰ Напоминание: ${title}\n${body}`);
          }
        }
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [reminders, notes]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg)]">
      {/* Боковая панель: на мобильном выезжает поверх. */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-72 transform border-r border-[var(--border)] bg-[var(--panel)] transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Список заметок: скрывается на мобильном, когда открыт редактор. */}
      <div
        className={`w-full flex-col border-r border-[var(--border)] bg-[var(--panel)] md:flex md:w-80 ${
          selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 hover:bg-black/5"
            aria-label="Меню"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold">AI Notes</span>
        </div>
        <NoteList />
      </div>

      {/* Редактор. */}
      <div className={`flex-1 ${selectedId ? "flex" : "hidden md:flex"} flex-col bg-[var(--bg)]`}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            Загрузка…
          </div>
        ) : selectedId ? (
          <NoteEditor key={selectedId} noteId={selectedId} />
        ) : (
          <div className="hidden h-full flex-col items-center justify-center text-[var(--muted)] md:flex">
            <div className="text-5xl">📝</div>
            <p className="mt-3">Выберите заметку или создайте новую</p>
          </div>
        )}
      </div>
    </div>
  );
}
