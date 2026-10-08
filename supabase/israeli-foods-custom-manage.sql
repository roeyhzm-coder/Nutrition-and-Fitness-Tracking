-- Identify custom catalog rows and allow owners to delete them.
-- Runtime source of truth: src/data/foods/

alter table public.israeli_foods
  add column if not exists is_custom boolean not null default false;

update public.israeli_foods
set is_custom = (is_system = false)
where is_custom is distinct from (is_system = false);

drop policy if exists "israeli_foods_custom_delete" on public.israeli_foods;
create policy "israeli_foods_custom_delete"
  on public.israeli_foods for delete
  using (is_system = false);

grant select, insert, update, delete on public.israeli_foods to anon, authenticated;
