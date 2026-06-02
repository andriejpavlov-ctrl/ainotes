"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { docToPlainText } from "@/lib/markdown";
import { genId } from "@/lib/id";
import { EMPTY_DOC, type JSONContent, type Note, type Reminder } from "@/lib/types";

type View = "active" | "archive";
export type SyncStatus = "synced" | "saving" | "error";

interface State {
  userId: string | null;
  notes: Note[];
  reminders: Reminder[];
  selectedId: string | null;
  view: View;
  loading: boolean;
  syncStatus: SyncStatus;
  online: boolean;
  searchOpen: boolean;

  init: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  setOnline: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  select: (id: string | null) => void;
  setView: (v: View) => void;

  createNote: () => Promise<string | null>;
  updateNoteContent: (id: string, title: string, content: JSONContent) => Promise<void>;
  renameNote: (id: string, title: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  softDelete: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  deletePermanent: (id: string) => Promise<void>;
  emptyArchive: () => Promise<void>;

  createReminder: (
    noteId: string,
    remindAt: string,
    label: string,
    anchorText: string | null,
  ) => Promise<void>;
  toggleReminderDone: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
}

const supabase = createClient();

// ── Локальный кэш (мгновенный показ списка до ответа сети) ──────────
const CACHE_PREFIX = "ai-notes-cache:";

function loadCache(userId: string): { notes: Note[]; reminders: Reminder[] } | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_PREFIX + userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let cacheTimer: ReturnType<typeof setTimeout> | null = null;
function saveCache(userId: string, notes: Note[], reminders: Reminder[]) {
  if (typeof localStorage === "undefined") return;
  if (cacheTimer) clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    try {
      localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify({ notes, reminders }));
    } catch {
      // переполнение квоты — игнорируем
    }
  }, 300);
}

// Загрузка заметок и напоминаний. ok=false при ошибке заметок,
// чтобы не затирать уже показанные данные при сбое токена.
async function fetchAll(userId: string) {
  const [notesRes, remRes] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", userId),
    supabase.from("reminders").select("*").eq("user_id", userId).order("remind_at"),
  ]);

  if (notesRes.error) {
    console.error("Ошибка загрузки заметок:", notesRes.error);
    return { ok: false as const, notes: [], reminders: [] };
  }

  return {
    ok: true as const,
    notes: (notesRes.data ?? []) as Note[],
    reminders: (remRes.data ?? []) as Reminder[],
  };
}

let realtimeBound = false;
let cacheSubBound = false;

// Счётчик незавершённых записей в БД для индикатора синхронизации.
let pendingWrites = 0;

async function track<T extends { error?: unknown }>(p: PromiseLike<T>): Promise<T> {
  pendingWrites++;
  useStore.setState({ syncStatus: "saving" });
  try {
    const res = await p;
    pendingWrites = Math.max(0, pendingWrites - 1);
    useStore.setState({
      syncStatus: res?.error ? "error" : pendingWrites > 0 ? "saving" : "synced",
    });
    return res;
  } catch (e) {
    pendingWrites = Math.max(0, pendingWrites - 1);
    useStore.setState({ syncStatus: "error" });
    throw e;
  }
}

export const useStore = create<State>((set, get) => ({
  userId: null,
  notes: [],
  reminders: [],
  selectedId: null,
  view: "active",
  loading: true,
  syncStatus: "synced",
  online: true,
  searchOpen: false,

  init: async (userId) => {
    set({ userId });

    // 1) Мгновенно показываем список из локального кэша.
    const cached = loadCache(userId);
    if (cached && cached.notes) {
      set({ notes: cached.notes, reminders: cached.reminders ?? [], loading: false });
    } else {
      set({ loading: true });
    }

    // Сохраняем кэш при любых изменениях заметок/напоминаний (один раз).
    if (!cacheSubBound) {
      cacheSubBound = true;
      useStore.subscribe((s) => {
        if (s.userId) saveCache(s.userId, s.notes, s.reminders);
      });
    }

    // 2) Обновляем из сети в фоне (stale-while-revalidate).
    try {
      await supabase.auth.getSession();
      const { ok, notes, reminders } = await fetchAll(userId);
      if (ok) set({ notes, reminders });
    } catch (e) {
      console.error("Не удалось загрузить данные:", e);
    } finally {
      set({ loading: false });
    }

    // Если данные пришли пустыми — возможна гонка с авторизацией; повторяем.
    if (get().notes.length === 0) {
      setTimeout(() => {
        if (get().notes.length === 0) get().refresh();
      }, 1200);
    }

    if (!realtimeBound) {
      realtimeBound = true;
      // Перезагружаем данные при изменении сессии (вход/обновление токена).
      supabase.auth.onAuthStateChange(() => get().refresh());

      let t: ReturnType<typeof setTimeout> | null = null;
      const reload = () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => get().refresh(), 1200);
      };
      supabase
        .channel("ai-notes-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, reload)
        .subscribe();
    }
  },

  refresh: async () => {
    const { userId } = get();
    if (!userId) return;
    const { ok, notes, reminders } = await fetchAll(userId);
    if (ok) set({ notes, reminders });
  },

  setOnline: (v) => set({ online: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  select: (id) => set({ selectedId: id }),
  setView: (v) => set({ view: v, selectedId: null }),

  createNote: async () => {
    const { userId } = get();
    if (!userId) return null;
    const id = genId();
    const now = new Date().toISOString();
    const note: Note = {
      id,
      user_id: userId,
      title: "",
      content: EMPTY_DOC,
      content_text: "",
      is_pinned: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };
    set((s) => ({ notes: [note, ...s.notes], selectedId: id }));

    const { error } = await track(
      supabase
        .from("notes")
        .insert({ id, user_id: userId, title: "", content: EMPTY_DOC, content_text: "" }),
    );
    if (error) {
      set((s) => ({
        notes: s.notes.filter((n) => n.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      }));
      return null;
    }
    return id;
  },

  updateNoteContent: async (id, title, content) => {
    const content_text = docToPlainText(content);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id
          ? { ...n, title, content, content_text, updated_at: new Date().toISOString() }
          : n,
      ),
    }));
    await track(supabase.from("notes").update({ title, content, content_text }).eq("id", id));
  },

  renameNote: async (id, title) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, title, updated_at: new Date().toISOString() } : n,
      ),
    }));
    await track(supabase.from("notes").update({ title }).eq("id", id));
  },

  togglePin: async (id) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    // Лимит закреплённых — не более 5.
    if (!note.is_pinned) {
      const pinned = notes.filter((n) => !n.deleted_at && n.is_pinned).length;
      if (pinned >= 5) {
        alert("Можно закрепить не больше 5 заметок. Открепите одну, чтобы закрепить другую.");
        return;
      }
    }
    const is_pinned = !note.is_pinned;
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, is_pinned } : n)),
    }));
    await track(supabase.from("notes").update({ is_pinned }).eq("id", id));
  },

  softDelete: async (id) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, deleted_at: new Date().toISOString() } : n,
      ),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    await track(supabase.from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id));
  },

  restore: async (id) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, deleted_at: null } : n)),
    }));
    await track(supabase.from("notes").update({ deleted_at: null }).eq("id", id));
  },

  deletePermanent: async (id) => {
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    await track(supabase.from("notes").delete().eq("id", id));
  },

  emptyArchive: async () => {
    const ids = get().notes.filter((n) => n.deleted_at).map((n) => n.id);
    if (ids.length === 0) return;
    set((s) => ({ notes: s.notes.filter((n) => !n.deleted_at), selectedId: null }));
    await track(supabase.from("notes").delete().in("id", ids));
  },

  createReminder: async (noteId, remindAt, label, anchorText) => {
    const { userId } = get();
    if (!userId) return;
    const { data } = await track(
      supabase
        .from("reminders")
        .insert({
          user_id: userId,
          note_id: noteId,
          remind_at: remindAt,
          label,
          anchor_text: anchorText,
        })
        .select("*")
        .single(),
    );
    if (data) set((s) => ({ reminders: [...s.reminders, data as Reminder] }));
  },

  toggleReminderDone: async (id) => {
    const r = get().reminders.find((x) => x.id === id);
    if (!r) return;
    const done = !r.done;
    set((s) => ({
      reminders: s.reminders.map((x) => (x.id === id ? { ...x, done } : x)),
    }));
    await track(supabase.from("reminders").update({ done }).eq("id", id));
  },

  deleteReminder: async (id) => {
    set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) }));
    await track(supabase.from("reminders").delete().eq("id", id));
  },
}));
