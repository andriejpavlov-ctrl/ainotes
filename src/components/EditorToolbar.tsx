"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import { applyNbspToDoc } from "@/lib/typograf";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Code2,
  Link as LinkIcon,
  Table as TableIcon,
  Image as ImageIcon,
  Eraser,
  Highlighter,
  WrapText,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Indent,
  Outdent,
  Undo2,
  Redo2,
} from "lucide-react";

const TEXT_COLORS = ["#1f2024", "#ef4444", "#f0a500", "#22c55e", "#3b82f6", "#8b5cf6"];
const HIGHLIGHT_COLORS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#e9d5ff"];

function Btn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors disabled:opacity-30 ${
        active ? "bg-accent text-accent-ink" : "text-ink hover:bg-surface2"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-line" />;

export default function EditorToolbar({
  editor,
  onImage,
  imageCount,
}: {
  editor: Editor;
  onImage: (file: File) => void;
  imageCount: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Ссылка (URL):", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  // Изменение уровня вложенности списка (маркированного/нумерованного/чек-листа).
  function indent() {
    if (editor.can().sinkListItem("listItem")) editor.chain().focus().sinkListItem("listItem").run();
    else editor.chain().focus().sinkListItem("taskItem").run();
  }
  function outdent() {
    if (editor.can().liftListItem("listItem")) editor.chain().focus().liftListItem("listItem").run();
    else editor.chain().focus().liftListItem("taskItem").run();
  }

  // Применяет неразрывные пробелы ко всему документу (требование №6).
  function applyTypography() {
    const fixed = applyNbspToDoc(editor.getJSON());
    editor.commands.setContent(fixed as never, true);
  }

  const canAddImage = imageCount < 10;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface px-3 py-2 sm:px-4">
      {/* История */}
      <Btn title="Отменить (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={16} />
      </Btn>
      <Btn title="Повторить (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={16} />
      </Btn>
      <Sep />

      {/* Стиль абзаца */}
      <Btn title="Обычный текст" active={editor.isActive("paragraph") && !editor.isActive("heading")} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow size={16} />
      </Btn>
      <Btn title="Заголовок 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={16} />
      </Btn>
      <Btn title="Заголовок 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={16} />
      </Btn>
      <Btn title="Заголовок 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={16} />
      </Btn>
      <Sep />

      {/* Начертание */}
      <Btn title="Жирный" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={16} />
      </Btn>
      <Btn title="Курсив" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={16} />
      </Btn>
      <Btn title="Подчёркнутый" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={16} />
      </Btn>
      <Btn title="Зачёркнутый" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={16} />
      </Btn>
      <Sep />

      {/* Цвет текста */}
      <span className="flex items-center gap-1 px-1" title="Цвет текста">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title="Цвет текста"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setColor(c).run()}
            className="h-4 w-4 rounded-full border border-black/10"
            style={{ backgroundColor: c }}
          />
        ))}
      </span>
      <Sep />

      {/* Выделение цветом */}
      <span className="flex items-center gap-1 px-1" title="Выделить цветом">
        <Highlighter size={15} className="text-muted" />
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title="Выделить цветом"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
            className="h-4 w-4 rounded-[4px] border border-black/10"
            style={{ backgroundColor: c }}
          />
        ))}
      </span>
      <Sep />

      {/* Списки */}
      <Btn title="Маркированный список" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={16} />
      </Btn>
      <Btn title="Нумерованный список" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={16} />
      </Btn>
      <Btn title="Чек-лист" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks size={16} />
      </Btn>
      <Btn title="Уровень глубже (Tab)" onClick={indent}>
        <Indent size={16} />
      </Btn>
      <Btn title="Уровень выше (Shift+Tab)" onClick={outdent}>
        <Outdent size={16} />
      </Btn>
      <Sep />

      {/* Блоки */}
      <Btn title="Цитата" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={16} />
      </Btn>
      <Btn title="Код (строка)" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code size={16} />
      </Btn>
      <Btn title="Блок кода" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code2 size={16} />
      </Btn>
      <Btn title="Ссылка" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon size={16} />
      </Btn>
      <Btn title="Вставить таблицу" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <TableIcon size={16} />
      </Btn>
      <Btn title={canAddImage ? "Вставить изображение" : "Достигнут лимит 10 изображений"} disabled={!canAddImage} onClick={() => fileRef.current?.click()}>
        <ImageIcon size={16} />
      </Btn>
      <Sep />

      {/* Сервис */}
      <Btn title="Неразрывные пробелы (типографика)" onClick={applyTypography}>
        <WrapText size={16} />
      </Btn>
      <Btn title="Очистить форматирование" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <Eraser size={16} />
      </Btn>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImage(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
