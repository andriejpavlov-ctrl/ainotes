"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { docToMarkdown, docToPlainText, downloadFile } from "@/lib/markdown";
import TagManager from "./TagManager";
import {
  Plus,
  Search,
  Sparkles,
  Archive,
  FileText,
  Download,
  LogOut,
  X,
} from "lucide-react";

export default function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const createNote = useStore((s) => s.createNote);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const select = useStore((s) => s.select);
  const notes = useStore((s) => s.notes);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  async function handleNew() {
    await createNote();
    onNavigate();
  }

  // ИИ-поиск (требование №4).
  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSummary(null);
    setResults([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSummary("ИИ не ответил: " + (data.error || `ошибка ${res.status}`));
      } else {
        setSummary(data.summary ?? "");
        setResults(data.relevant_ids ?? []);
      }
    } catch (e) {
      setSummary("Не удалось связаться с сервером: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSearching(false);
    }
  }

  function openResult(id: string) {
    setView("active");
    select(id);
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

  const resultNotes = results
    .map((id) => notes.find((n) => n.id === id))
    .filter(Boolean) as typeof notes;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <span className="text-lg font-bold">эйай ноутс</span>
        <button onClick={handleNew} className="rounded-lg bg-[var(--accent)] p-2 text-black hover:brightness-105" aria-label="Новая заметка">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 no-scrollbar">
        {/* ИИ-поиск */}
        <form onSubmit={runSearch} className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ИИ-поиск по заметкам…"
            className="w-full rounded-lg border border-[var(--border)] py-2 pl-9 pr-9 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--accent)]" aria-label="Искать">
            <Sparkles size={16} />
          </button>
        </form>

        {searching && <p className="mb-2 px-1 text-sm text-[var(--muted)]">ИИ ищет…</p>}

        {summary !== null && !searching && (
          <div className="mb-3 rounded-lg bg-accent-soft p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 font-medium text-[var(--accent)]">
                <Sparkles size={14} /> ИИ-сводка
              </span>
              <button onClick={() => { setSummary(null); setResults([]); }} aria-label="Закрыть">
                <X size={14} className="text-[var(--muted)]" />
              </button>
            </div>
            <p className="leading-relaxed">{summary}</p>
            {resultNotes.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-black/5 pt-2">
                {resultNotes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openResult(n.id)}
                    className="block w-full truncate rounded px-2 py-1 text-left hover:bg-black/5"
                  >
                    📄 {n.title || "Без названия"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Переключение вида */}
        <div className="mb-3 flex gap-1 rounded-lg bg-black/5 p-1 text-sm">
          <button
            onClick={() => setView("active")}
            className={`flex-1 rounded-md py-1.5 ${view === "active" ? "bg-white shadow-sm" : "text-[var(--muted)]"}`}
          >
            Заметки
          </button>
          <button
            onClick={() => setView("archive")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 ${view === "archive" ? "bg-white shadow-sm" : "text-[var(--muted)]"}`}
          >
            <Archive size={14} /> Архив
          </button>
        </div>

        {/* Теги */}
        <TagManager />
      </div>

      {/* Низ: экспорт и выход */}
      <div className="space-y-1 border-t border-[var(--border)] p-3 text-sm">
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
