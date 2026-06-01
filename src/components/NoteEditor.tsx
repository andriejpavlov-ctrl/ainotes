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
import {
  ChevronLeft,
  MoreVertical,
  Tag as TagIcon,
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
  const tags = useStore((s) => s.tags);
  const assignTag = useStore((s) => s.assignTag);
  const unassignTag = useStore((s) => s.unassignTag);

  const [title, setTitle] = useState(note?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
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

  const noteTagIds = new Set((note.tags ?? []).map((t) => t.id));

  return (
    <div className="flex h-full flex-col">
      {/* Шапка */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--panel)] px-2 py-2">
        <button onClick={() => select(null)} className="rounded-lg p-2 hover:bg-black/5 md:hidden" aria-label="Назад">
          <ChevronLeft size={20} />
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок"
          className="flex-1 bg-transparent px-2 text-lg font-semibold outline-none"
        />
        <span className="flex w-6 items-center justify-center text-[var(--muted)]">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </span>

        {/* Меню действий */}
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="rounded-lg p-2 hover:bg-black/5" aria-label="Действия">
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--panel)] py-1 shadow-lg">
                <MenuItem icon={<TagIcon size={16} />} label="Теги" onClick={() => { setTagOpen(true); setMenuOpen(false); }} />
                <MenuItem icon={<Bell size={16} />} label="Напоминание" onClick={() => { setReminderFor(null); setMenuOpen(false); }} />
                <MenuItem icon={<Scissors size={16} />} label="Сократить (ИИ)" onClick={shortenNote} />
                <MenuItem icon={<FileDown size={16} />} label="Экспорт в Markdown" onClick={() => exportNote("md")} />
                <MenuItem icon={<FileDown size={16} />} label="Экспорт в .txt" onClick={() => exportNote("txt")} />
                <div className="my-1 h-px bg-[var(--border)]" />
                <MenuItem icon={<Trash2 size={16} />} label="В архив" danger onClick={() => { softDelete(noteId); setMenuOpen(false); }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Теги заметки */}
      {(note.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-2">
          {(note.tags ?? []).map((t) => (
            <span key={t.id} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: t.color + "22", color: t.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Поповер выбора тегов */}
      {tagOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 pt-24" onClick={() => setTagOpen(false)}>
          <div className="w-72 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="mb-2 font-medium">Теги заметки</h4>
            {tags.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Создайте теги в боковой панели.</p>
            ) : (
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {tags.map((t) => {
                  const on = noteTagIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => (on ? unassignTag(noteId, t.id) : assignTag(noteId, t.id))}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5"
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${on ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--border)]"}`}>
                        {on && <Check size={12} />}
                      </span>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="flex-1 truncate text-left">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 ${danger ? "text-red-600" : ""}`}
    >
      {icon} {label}
    </button>
  );
}
