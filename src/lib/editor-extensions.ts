// Набор расширений TipTap для редактора заметок.
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

export function buildExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: { HTMLAttributes: { class: "code-block" } },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image.configure({ inline: false, allowBase64: false }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({
      placeholder: "Начните писать заметку…",
    }),
  ];
}
