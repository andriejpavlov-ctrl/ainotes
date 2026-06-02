"use client";

import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { docToMarkdown, docToPlainText, downloadFile } from "@/lib/markdown";
import NoteList from "./NoteList";
import SyncStatus from "./SyncStatus";
import Button from "./ui/Button";
import IconButton from "./ui/IconButton";
import { Plus, Download, LogOut, Archive, FileEdit, Search } from "lucide-react";

// Левый столбец: шапка, список, низ (архив, синхронизация, экспорт, выход).
export default function ListColumn() {
  const createNote = useStore((s) => s.createNote);
  const notes = useStore((s) => s.notes);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const setSearchOpen = useStore((s) => s.setSearchOpen);

  function exportAll(format: "md" | "txt") {
    const active = notes.filter((n) => !n.deleted_at);
    const parts = active.map((n) =>
      format === "md"
        ? docToMarkdown(n.content, n.title || "Без названия")
        : `${n.title || "Без названия"}\n\n${docToPlainText(n.content)}`,
    );
    const sep = format === "md" ? "\n\n---\n\n" : "\n\n========================================\n\n";
    downloadFile(`ai-notes-export.${format}`, parts.join(sep), format === "md" ? "text/markdown" : "text/plain");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex h-full flex-col">
      {/* Шапка */}
      <header className="flex h-14 items-center justify-between gap-2 border-b border-line px-4">
        <span className="text-[17px] font-bold tracking-tight">эйай ноутс</span>
        <div className="flex items-center gap-1.5">
          <IconButton size="sm" variant="outline" onClick={() => setSearchOpen(true)} title="Поиск (⌘K / Ctrl+K)" aria-label="Поиск">
            <Search size={16} />
          </IconButton>
          <Button size="sm" variant="primary" onClick={() => createNote()}>
            <Plus size={16} /> Новая
          </Button>
        </div>
      </header>

      {/* Список */}
      <div className="min-h-0 flex-1">
        <NoteList />
      </div>

      {/* Низ */}
      <footer className="border-t border-line px-4 py-3">
        <SyncStatus />
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant={view === "archive" ? "primary" : "outline"}
            className="flex-1"
            onClick={() => setView(view === "archive" ? "active" : "archive")}
          >
            {view === "archive" ? <FileEdit size={15} /> : <Archive size={15} />}
            {view === "archive" ? "К заметкам" : "Архив"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportAll("md")} title="Экспортировать все заметки в Markdown">
            <Download size={14} /> .md
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportAll("txt")} title="Экспортировать все заметки в текст">
            <Download size={14} /> .txt
          </Button>
          <IconButton size="sm" variant="outline" onClick={signOut} title="Выйти" aria-label="Выйти">
            <LogOut size={15} />
          </IconButton>
        </div>
      </footer>
    </div>
  );
}
