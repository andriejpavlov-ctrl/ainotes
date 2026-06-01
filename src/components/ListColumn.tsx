"use client";

import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { docToMarkdown, docToPlainText, downloadFile } from "@/lib/markdown";
import NoteList from "./NoteList";
import SyncStatus from "./SyncStatus";
import Button from "./ui/Button";
import IconButton from "./ui/IconButton";
import { Plus, FileText, Download, LogOut, Archive, FileEdit } from "lucide-react";

// Левый столбец: шапка, список, низ (архив, синхронизация, экспорт, выход).
export default function ListColumn() {
  const createNote = useStore((s) => s.createNote);
  const notes = useStore((s) => s.notes);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

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
      <header className="flex h-14 items-center justify-between border-b border-line px-4">
        <span className="text-[17px] font-bold tracking-tight">эйай ноутс</span>
        <Button size="sm" variant="primary" onClick={() => createNote()}>
          <Plus size={16} /> Новая
        </Button>
      </header>

      {/* Список */}
      <div className="min-h-0 flex-1">
        <NoteList />
      </div>

      {/* Низ */}
      <footer className="border-t border-line p-2">
        <SyncStatus />
        <div className="mt-1.5 flex items-center gap-1.5">
          <Button
            size="sm"
            variant={view === "archive" ? "primary" : "outline"}
            className="flex-1"
            onClick={() => setView(view === "archive" ? "active" : "archive")}
          >
            {view === "archive" ? <FileEdit size={15} /> : <Archive size={15} />}
            {view === "archive" ? "К заметкам" : "Архив"}
          </Button>
          <IconButton size="sm" variant="outline" onClick={() => exportAll("md")} title="Экспорт в Markdown" aria-label="Экспорт в Markdown">
            <FileText size={15} />
          </IconButton>
          <IconButton size="sm" variant="outline" onClick={() => exportAll("txt")} title="Экспорт в .txt" aria-label="Экспорт в .txt">
            <Download size={15} />
          </IconButton>
          <IconButton size="sm" variant="outline" onClick={signOut} title="Выйти" aria-label="Выйти">
            <LogOut size={15} />
          </IconButton>
        </div>
      </footer>
    </div>
  );
}
