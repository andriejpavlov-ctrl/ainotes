"use client";

import { BubbleMenu, type Editor } from "@tiptap/react";
import {
  Trash2,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ArrowDownToLine,
  Heading,
  TableCellsMerge,
  TableCellsSplit,
} from "lucide-react";

function TBtn({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 items-center gap-1 rounded px-2 text-[12px] transition-colors hover:bg-surface2 ${
        danger ? "text-danger hover:bg-danger/10" : "text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-0.5 h-5 w-px bg-line" />;

// Плавающая панель управления таблицей (по образцу Confluence).
// Рендерится через BubbleMenu (портал) — не вмешивается в поток DOM
// редактора, поэтому не вызывает конфликтов React/ProseMirror.
export default function TableControls({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableMenu"
      shouldShow={({ editor: ed }) => ed.isActive("table")}
      tippyOptions={{ placement: "top", maxWidth: "none", duration: 100 }}
    >
      <div className="flex max-w-[92vw] flex-wrap items-center gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-pop">
        <TBtn title="Добавить столбец слева" onClick={() => c().addColumnBefore().run()}>
          <ArrowLeftToLine size={14} /> столбец
        </TBtn>
        <TBtn title="Добавить столбец справа" onClick={() => c().addColumnAfter().run()}>
          столбец <ArrowRightToLine size={14} />
        </TBtn>
        <TBtn title="Удалить столбец" danger onClick={() => c().deleteColumn().run()}>
          <Trash2 size={14} /> столбец
        </TBtn>
        <Sep />
        <TBtn title="Добавить строку сверху" onClick={() => c().addRowBefore().run()}>
          <ArrowUpToLine size={14} /> строка
        </TBtn>
        <TBtn title="Добавить строку снизу" onClick={() => c().addRowAfter().run()}>
          строка <ArrowDownToLine size={14} />
        </TBtn>
        <TBtn title="Удалить строку" danger onClick={() => c().deleteRow().run()}>
          <Trash2 size={14} /> строка
        </TBtn>
        <Sep />
        <TBtn title="Заголовок-строка" onClick={() => c().toggleHeaderRow().run()}>
          <Heading size={14} /> строка
        </TBtn>
        <TBtn title="Заголовок-столбец" onClick={() => c().toggleHeaderColumn().run()}>
          <Heading size={14} /> столбец
        </TBtn>
        <Sep />
        <TBtn title="Объединить ячейки" onClick={() => c().mergeCells().run()}>
          <TableCellsMerge size={14} />
        </TBtn>
        <TBtn title="Разделить ячейку" onClick={() => c().splitCell().run()}>
          <TableCellsSplit size={14} />
        </TBtn>
        <Sep />
        <TBtn title="Удалить таблицу" danger onClick={() => c().deleteTable().run()}>
          <Trash2 size={14} /> таблицу
        </TBtn>
      </div>
    </BubbleMenu>
  );
}
