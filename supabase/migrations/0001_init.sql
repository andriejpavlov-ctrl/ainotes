-- ════════════════════════════════════════════════════════════════
-- AI Notes — начальная схема базы данных
-- Выполните в Supabase: SQL Editor → New query → вставьте → Run.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Заметки ─────────────────────────────────────────────────────
create table if not exists public.notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null default '',
  -- Содержимое в формате TipTap (ProseMirror) JSON.
  content      jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  -- Плоский текст для полнотекстового поиска и ИИ-поиска.
  content_text text not null default '',
  is_pinned    boolean not null default false,
  -- Мягкое удаление: заметка попадает в Архив, пока не удалена окончательно.
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists notes_user_idx on public.notes (user_id);
create index if not exists notes_updated_idx on public.notes (updated_at desc);
create index if not exists notes_deleted_idx on public.notes (deleted_at);
-- Полнотекстовый поиск (русский + английский).
create index if not exists notes_fts_idx
  on public.notes
  using gin (to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(content_text, '')));

-- ── Теги (цветные лейблы) ───────────────────────────────────────
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#f0a500',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists tags_user_idx on public.tags (user_id);

-- ── Связь заметок и тегов ───────────────────────────────────────
create table if not exists public.note_tags (
  note_id uuid not null references public.notes (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (note_id, tag_id)
);

create index if not exists note_tags_tag_idx on public.note_tags (tag_id);

-- ── Напоминания (к заметке или к фрагменту текста) ──────────────
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  note_id     uuid not null references public.notes (id) on delete cascade,
  remind_at   timestamptz not null,
  label       text not null default '',
  -- Если напоминание привязано к части текста — здесь её цитата.
  anchor_text text,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists reminders_user_idx on public.reminders (user_id);
create index if not exists reminders_due_idx on public.reminders (remind_at) where done = false;

-- ── Автообновление updated_at ───────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- Row Level Security: каждый пользователь видит только свои данные.
-- ════════════════════════════════════════════════════════════════
alter table public.notes     enable row level security;
alter table public.tags      enable row level security;
alter table public.note_tags enable row level security;
alter table public.reminders enable row level security;

-- notes
drop policy if exists "notes_owner" on public.notes;
create policy "notes_owner" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tags
drop policy if exists "tags_owner" on public.tags;
create policy "tags_owner" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reminders
drop policy if exists "reminders_owner" on public.reminders;
create policy "reminders_owner" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- note_tags: доступ, если заметка принадлежит пользователю.
drop policy if exists "note_tags_owner" on public.note_tags;
create policy "note_tags_owner" on public.note_tags
  for all using (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════
-- Storage: бакет для изображений в заметках (до 10 на заметку).
-- ════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do nothing;

-- Пользователь управляет только своими файлами (папка = его user_id).
drop policy if exists "note_images_read" on storage.objects;
create policy "note_images_read" on storage.objects
  for select using (bucket_id = 'note-images');

drop policy if exists "note_images_write" on storage.objects;
create policy "note_images_write" on storage.objects
  for insert with check (
    bucket_id = 'note-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "note_images_delete" on storage.objects;
create policy "note_images_delete" on storage.objects
  for delete using (
    bucket_id = 'note-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
