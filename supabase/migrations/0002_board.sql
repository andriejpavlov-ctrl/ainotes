-- AI Notes — доска (стикеры и стрелки) для заметок.
-- Выполните в Supabase: SQL Editor → вставьте → Run.

alter table public.notes add column if not exists board jsonb;
