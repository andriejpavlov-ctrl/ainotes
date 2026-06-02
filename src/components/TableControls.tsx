"use client";

import type { Editor } from "@tiptap/react";
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

const Sep = () => <span className="mx-1 h-5 w-px bg-line" />;

// Контекстная панель таблицы (по образцу Confluence): столбцы, строки,
// заголовки, объединение/разделение ячеек, удаление таблицы.
export default function TableControls({ editor }: { editor: Editor }) {
  if (!editor.isActive("table")) return null;
  const c = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface2/60 px-3 py-1.5 sm:px-4">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Таблица</span>

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
  );
}
