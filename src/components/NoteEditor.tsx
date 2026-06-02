"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { buildExtensions } from "@/lib/editor-extensions";
import { applyNbspToDoc } from "@/lib/typograf";
import { genId } from "@/lib/id";
import {
  docToMarkdown,
  docToPlainText,
  downloadFile,
  safeFilename,
} from "@/lib/markdown";
import type { JSONContent } from "@/lib/types";
import EditorToolbar from "./EditorToolbar";
import EditorBubbleMenu from "./EditorBubbleMenu";
import ReminderDialog from "./ReminderDialog";
import NoteTagBar from "./NoteTagBar";
import IconButton from "./ui/IconButton";
import {
  ChevronLeft,
  MoreVertical,
  Bell,
  Scissors,
  FileDown,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";

// Преобразует «плоский» текст (абзацы через пустую строку) в документ TipTap.
function textToDoc(text: string): JSONContent {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return {
    type: "doc",
    content: paras.length
      ? paras.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }))
      : [{ type: "paragraph" }],
  };
}

function countImages(doc: JSONContent): number {
  let n = 0;
  const walk = (node: JSONContent) => {
    if (node.type === "image") n++;
    (node.content ?? []).forEach(walk);
  };
  walk(doc);
  return n;
}

export default function NoteEditor({ noteId }: { noteId: string }) {
  const note = useStore((s) => s.notes.find((n) => n.id === noteId));
  const userId = useStore((s) => s.userId);
  const updateNoteContent = useStore((s) => s.updateNoteContent);
  const softDelete = useStore((s) => s.softDelete);
  const select = useStore((s) => s.select);

  const [title, setTitle] = useState(note?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reminderFor, setReminderFor] = useState<string | null | undefined>(undefined);
  const [shortening, setShortening] = useState(false);
  const [imageCount, setImageCount] = useState(note ? countImages(note.content) : 0);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const editor = useEditor({
    extensions: buildExtensions(),
    content: note?.content ?? { type: "doc", content: [] },
    editorProps: {
      attributes: { class: "px-4 sm:px-8 py-4 max-w-3xl mx-auto w-full" },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setImageCount(countImages(editor.getJSON() as JSONContent));
      scheduleSave();
    },
  });

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      if (!editor) return;
      // Автоматически проставляем неразрывные пробелы перед сохранением (№6).
      const doc = applyNbspToDoc(editor.getJSON() as JSONContent);
      await updateNoteContent(noteId, titleRef.current, doc);
      setSaving(false);
    }, 700);
  }, [editor, noteId, updateNoteContent]);

  // Сохранение при изменении заголовка.
  useEffect(() => {
    if (note && title !== note.title) scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Загрузка изображения в Supabase Storage (до 10 на заметку).
  async function handleImage(file: File) {
    if (!editor || !userId) return;
    if (countImages(editor.getJSON() as JSONContent) >= 10) {
      alert("В одной заметке можно не больше 10 изображений.");
      return;
    }
    const supabase = createClient();
    const path = `${userId}/${noteId}/${genId()}`;
    const { error } = await supabase.storage.from("note-images").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      alert("Не удалось загрузить изображение: " + error.message);
      return;
    }
    const { data } = supabase.storage.from("note-images").getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
  }

  // Сокращение всей заметки через ИИ (№10).
  async function shortenNote() {
    if (!editor) return;
    setMenuOpen(false);
    const text = docToPlainText(editor.getJSON() as JSONContent);
    if (!text.trim()) return;
    setShortening(true);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.result) {
        alert("ИИ не ответил: " + (data.error || `ошибка ${res.status}`));
      } else if (window.confirm("Заменить заметку сокращённой версией?\n\n" + data.result)) {
        editor.chain().focus().setContent(textToDoc(data.result) as never, true).run();
        scheduleSave();
      }
    } catch (e) {
      alert("Не удалось связаться с сервером: " + (e instanceof Error ? e.message : ""));
    } finally {
      setShortening(false);
    }
  }

  function exportNote(format: "md" | "txt") {
    if (!editor) return;
    setMenuOpen(false);
    const doc = editor.getJSON() as JSONContent;
    const content =
      format === "md" ? docToMarkdown(doc, title) : `${title}\n\n${docToPlainText(doc)}`;
    downloadFile(
      `${safeFilename(title)}.${format}`,
      content,
      format === "md" ? "text/markdown" : "text/plain",
    );
  }

  if (!note || !editor) {
    return <div className="flex h-full items-center justify-center text-[var(--muted)]">Загрузка…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Шапка: заголовок + теги в одну строку */}
      <div className="flex h-14 items-center gap-2 border-b border-line bg-surface px-2 sm:px-3">
        <IconButton onClick={() => select(null)} className="md:hidden" aria-label="Назад">
          <ChevronLeft size={20} />
        </IconButton>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок"
          className="min-w-0 flex-1 bg-transparent px-1 text-[17px] font-semibold tracking-tight outline-none focus:outline-none focus-visible:outline-none placeholder:text-muted"
        />

        {/* Теги на одном уровне с названием */}
        <div className="hidden max-w-[45%] sm:flex">
          <NoteTagBar noteId={noteId} noteTags={note.tags ?? []} />
        </div>

        <span className="flex w-5 shrink-0 items-center justify-center text-muted" title={saving ? "Сохранение…" : "Сохранено"}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} className="text-success" strokeWidth={2.5} />}
        </span>

        {/* Меню действий */}
        <div className="relative">
          <IconButton onClick={() => setMenuOpen((v) => !v)} aria-label="Действия">
            <MoreVertical size={18} />
          </IconButton>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-pop">
                <MenuItem icon={<Bell size={16} />} label="Напоминание" onClick={() => { setReminderFor(null); setMenuOpen(false); }} />
                <MenuItem icon={<Scissors size={16} />} label="Сократить (ИИ)" onClick={shortenNote} />
                <MenuItem icon={<FileDown size={16} />} label="Экспорт в Markdown" onClick={() => exportNote("md")} />
                <MenuItem icon={<FileDown size={16} />} label="Экспорт в .txt" onClick={() => exportNote("txt")} />
                <div className="my-1 h-px bg-line" />
                <MenuItem icon={<Trash2 size={16} />} label="В архив" danger onClick={() => { softDelete(noteId); setMenuOpen(false); }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Теги на мобильном — отдельной компактной строкой */}
      <div className="border-b border-line bg-surface px-3 py-2 sm:hidden">
        <NoteTagBar noteId={noteId} noteTags={note.tags ?? []} />
      </div>

      <EditorToolbar editor={editor} onImage={handleImage} imageCount={imageCount} />
      <EditorBubbleMenu editor={editor} onRemind={(text) => setReminderFor(text)} />

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {shortening && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="flex items-center gap-2 rounded-xl bg-[var(--panel)] px-5 py-3 shadow-lg">
            <Loader2 size={18} className="animate-spin text-[var(--accent)]" /> ИИ сокращает заметку…
          </div>
        </div>
      )}

      {reminderFor !== undefined && (
        <ReminderDialog noteId={noteId} anchorText={reminderFor ?? null} onClose={() => setReminderFor(undefined)} />
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-surface2 ${danger ? "text-danger" : "text-ink"}`}
    >
      {icon} {label}
    </button>
  );
}
