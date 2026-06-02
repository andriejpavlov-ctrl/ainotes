// Доменные типы AI Notes.

export type JSONContent = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
  [key: string]: unknown;
};

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

