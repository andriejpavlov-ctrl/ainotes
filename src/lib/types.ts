// Доменные типы AI Notes.

export type JSONContent = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
  [key: string]: unknown;
};

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: JSONContent;
  content_text: string;
  is_pinned: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Заполняется на клиенте после джойна.
  tags?: Tag[];
}

export interface Reminder {
  id: string;
  user_id: string;
  note_id: string;
  remind_at: string;
  label: string;
  anchor_text: string | null;
  done: boolean;
  created_at: string;
}

export const EMPTY_DOC: JSONContent = { type: "doc", content: [] };

// Палитра цветов для тегов.
export const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f0a500", // amber (акцент)
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
];
