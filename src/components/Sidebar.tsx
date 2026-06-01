"use client";

import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { docToMarkdown, docToPlainText, downloadFile } from "@/lib/markdown";
import SyncStatus from "./SyncStatus";
import { Plus, FileText, Download, LogOut } from "lucide-react";

export default function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const createNote = useStore((s) => s.createNote);
  const notes = useStore((s) => s.notes);

  async function handleNew() {
    await createNote();
    onNavigate();
  }

  // Экспорт всех активных заметок (требование №2).
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
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <span className="text-lg font-bold">эйай ноутс</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <button
          onClick={handleNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 font-medium text-black transition hover:brightness-105"
        >
          <Plus size={18} /> Новая заметка
        </button>
      </div>

      {/* Низ: синхронизация, экспорт, выход */}
      <div className="space-y-1 border-t border-[var(--border)] p-3 text-sm">
        <SyncStatus />
        <div className="flex gap-1">
          <button onClick={() => exportAll("md")} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] py-2 hover:bg-black/5">
            <FileText size={14} /> .md
          </button>
          <button onClick={() => exportAll("txt")} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] py-2 hover:bg-black/5">
            <Download size={14} /> .txt
          </button>
        </div>
        <button onClick={signOut} className="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[var(--muted)] hover:bg-black/5">
          <LogOut size={14} /> Выйти
        </button>
      </div>
    </div>
  );
}
