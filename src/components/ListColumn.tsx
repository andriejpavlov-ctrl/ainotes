"use client";

import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { docToMarkdown, docToPlainText, downloadFile } from "@/lib/markdown";
import NoteList from "./NoteList";
import SyncStatus from "./SyncStatus";
import { Plus, FileText, Download, LogOut } from "lucide-react";

// Левый столбец: название + создание заметки, список, низ (синхронизация/экспорт/выход).
export default function ListColumn() {
  const createNote = useStore((s) => s.createNote);
  const notes = useStore((s) => s.notes);

  async function handleNew() {
    await createNote();
  }

  function exportAll(format: "md" | "txt") {
    const active = notes.filter((n) => !n.deleted_at);
    const parts = active.map((n) =>
      format === "md"
        ? docToMarkdown(n.content, n.title || "Без названия")
        : `${n.title || "Без названия"}\n\n${docToPlainText(n.content)}`,
    );
    const sep = format === "md" ? "\n\n---\n\n" : "\n\n========================================\n\n";
    downloadFile(
      `ai-notes-export.${format}`,
      parts.join(sep),
      format === "md" ? "text/markdown" : "text/plain",
    );
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex h-full flex-col">
      {/* Шапка: название + новая заметка */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <span className="text-lg font-bold">эйай ноутс</span>
        <button
          onClick={handleNew}
          className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-black transition hover:brightness-105"
        >
          <Plus size={16} /> Новая
        </button>
      </div>

      {/* Список (со своей шапкой: поиск, переключатель, теги) */}
      <div className="min-h-0 flex-1">
        <NoteList />
      </div>

      {/* Низ: синхронизация, экспорт, выход */}
      <div className="space-y-1 border-t border-[var(--border)] p-2 text-sm">
        <SyncStatus />
        <div className="flex items-center gap-1">
          <button onClick={() => exportAll("md")} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] py-1.5 hover:bg-black/5">
            <FileText size={14} /> .md
          </button>
          <button onClick={() => exportAll("txt")} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] py-1.5 hover:bg-black/5">
            <Download size={14} /> .txt
          </button>
          <button onClick={signOut} title="Выйти" className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--muted)] hover:bg-black/5">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
