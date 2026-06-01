"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { docToPlainText } from "@/lib/markdown";
import { EMPTY_DOC, type JSONContent, type Note, type Reminder, type Tag } from "@/lib/types";

type View = "active" | "archive";

interface State {
  userId: string | null;
  notes: Note[];
  tags: Tag[];
  reminders: Reminder[];
  selectedId: string | null;
  view: View;
  activeTagFilter: string[]; // id тегов для фильтрации
  loading: boolean;

  init: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  select: (id: string | null) => void;
  setView: (v: View) => void;
  toggleTagFilter: (tagId: string) => void;
  clearTagFilter: () => void;

  createNote: () => Promise<string | null>;
  updateNoteContent: (id: string, title: string, content: JSONContent) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  softDelete: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  deletePermanent: (id: string) => Promise<void>;
  emptyArchive: () => Promise<void>;

  createTag: (name: string, color: string) => Promise<Tag | null>;
  deleteTag: (id: string) => Promise<void>;
  assignTag: (noteId: string, tagId: string) => Promise<void>;
  unassignTag: (noteId: string, tagId: string) => Promise<void>;

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

// Связывает теги с заметками через note_tags.
async function fetchAll(userId: string) {
  const [notesRes, tagsRes, ntRes, remRes] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", userId),
    supabase.from("tags").select("*").eq("user_id", userId).order("name"),
    supabase.from("note_tags").select("note_id, tag_id"),
    supabase.from("reminders").select("*").eq("user_id", userId).order("remind_at"),
  ]);

  const tags = (tagsRes.data ?? []) as Tag[];
  const tagById = new Map(tags.map((t) => [t.id, t]));
  const tagsByNote = new Map<string, Tag[]>();
  for (const row of (ntRes.data ?? []) as { note_id: string; tag_id: string }[]) {
    const tag = tagById.get(row.tag_id);
    if (!tag) continue;
    const arr = tagsByNote.get(row.note_id) ?? [];
    arr.push(tag);
    tagsByNote.set(row.note_id, arr);
  }

  const notes = ((notesRes.data ?? []) as Note[]).map((n) => ({
    ...n,
    tags: tagsByNote.get(n.id) ?? [],
  }));

  return { notes, tags, reminders: (remRes.data ?? []) as Reminder[] };
}

let realtimeBound = false;

export const useStore = create<State>((set, get) => ({
  userId: null,
  notes: [],
  tags: [],
  reminders: [],
  selectedId: null,
  view: "active",
  activeTagFilter: [],
  loading: true,

  init: async (userId) => {
    set({ userId, loading: true });
    const data = await fetchAll(userId);
    set({ ...data, loading: false });

    // Realtime-синхронизация между устройствами (требование №3).
    if (!realtimeBound) {
      realtimeBound = true;
      const reload = () => get().refresh();
      supabase
        .channel("ai-notes-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "tags" }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "note_tags" }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, reload)
        .subscribe();
    }
  },

  refresh: async () => {
    const { userId } = get();
    if (!userId) return;
    const data = await fetchAll(userId);
    set(data);
  },

  select: (id) => set({ selectedId: id }),
  setView: (v) => set({ view: v, selectedId: null }),
  toggleTagFilter: (tagId) =>
    set((s) => ({
      activeTagFilter: s.activeTagFilter.includes(tagId)
        ? s.activeTagFilter.filter((t) => t !== tagId)
        : [...s.activeTagFilter, tagId],
    })),
  clearTagFilter: () => set({ activeTagFilter: [] }),

  createNote: async () => {
    const { userId } = get();
    if (!userId) return null;
    // Оптимистично: заметка появляется мгновенно, запись в БД — фоном.
    const id = crypto.randomUUID();
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
      tags: [],
    };
    set((s) => ({ notes: [note, ...s.notes], selectedId: id }));

    const { error } = await supabase
      .from("notes")
      .insert({ id, user_id: userId, title: "", content: EMPTY_DOC, content_text: "" });
    if (error) {
      // Откат, если вставка не удалась.
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
    await supabase.from("notes").update({ title, content, content_text }).eq("id", id);
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const is_pinned = !note.is_pinned;
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, is_pinned } : n)),
    }));
    await supabase.from("notes").update({ is_pinned }).eq("id", id);
  },

  softDelete: async (id) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, deleted_at: new Date().toISOString() } : n,
      ),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    await supabase.from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  },

  restore: async (id) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, deleted_at: null } : n)),
    }));
    await supabase.from("notes").update({ deleted_at: null }).eq("id", id);
  },

  deletePermanent: async (id) => {
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    await supabase.from("notes").delete().eq("id", id);
  },

  emptyArchive: async () => {
    const ids = get().notes.filter((n) => n.deleted_at).map((n) => n.id);
    if (ids.length === 0) return;
    set((s) => ({ notes: s.notes.filter((n) => !n.deleted_at), selectedId: null }));
    await supabase.from("notes").delete().in("id", ids);
  },

  createTag: async (name, color) => {
    const { userId } = get();
    if (!userId) return null;
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: userId, name, color })
      .select("*")
      .single();
    if (error || !data) return null;
    const tag = data as Tag;
    set((s) => ({ tags: [...s.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }));
    return tag;
  },

  deleteTag: async (id) => {
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      activeTagFilter: s.activeTagFilter.filter((t) => t !== id),
      notes: s.notes.map((n) => ({
        ...n,
        tags: (n.tags ?? []).filter((t) => t.id !== id),
      })),
    }));
    await supabase.from("tags").delete().eq("id", id);
  },

  assignTag: async (noteId, tagId) => {
    const tag = get().tags.find((t) => t.id === tagId);
    if (!tag) return;
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId && !(n.tags ?? []).some((t) => t.id === tagId)
          ? { ...n, tags: [...(n.tags ?? []), tag] }
          : n,
      ),
    }));
    await supabase.from("note_tags").insert({ note_id: noteId, tag_id: tagId });
  },

  unassignTag: async (noteId, tagId) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? { ...n, tags: (n.tags ?? []).filter((t) => t.id !== tagId) }
          : n,
      ),
    }));
    await supabase.from("note_tags").delete().eq("note_id", noteId).eq("tag_id", tagId);
  },

  createReminder: async (noteId, remindAt, label, anchorText) => {
    const { userId } = get();
    if (!userId) return;
    const { data } = await supabase
      .from("reminders")
      .insert({
        user_id: userId,
        note_id: noteId,
        remind_at: remindAt,
        label,
        anchor_text: anchorText,
      })
      .select("*")
      .single();
    if (data) set((s) => ({ reminders: [...s.reminders, data as Reminder] }));
  },

  toggleReminderDone: async (id) => {
    const r = get().reminders.find((x) => x.id === id);
    if (!r) return;
    const done = !r.done;
    set((s) => ({
      reminders: s.reminders.map((x) => (x.id === id ? { ...x, done } : x)),
    }));
    await supabase.from("reminders").update({ done }).eq("id", id);
  },

  deleteReminder: async (id) => {
    set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) }));
    await supabase.from("reminders").delete().eq("id", id);
  },
}));
