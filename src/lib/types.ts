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
  board?: Board | null;
}

// ── Доска (стикеры + стрелки, как в Miro) ──────────────────────────
export interface Sticker {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface Connection {
  id: string;
  from: string; // id стикера
  to: string; // id стикера
}

export interface Board {
  stickers: Sticker[];
  connections: Connection[];
}

export const EMPTY_BOARD: Board = { stickers: [], connections: [] };

// Шаг невидимой сетки для примагничивания стикеров.
export const GRID = 90;

// Палитра стикеров.
export const STICKER_COLORS = ["#fff3b0", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#e9d5ff", "#fed7aa"];

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

