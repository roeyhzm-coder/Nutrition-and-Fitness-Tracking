-- Allow user-created catalog items (is_system = false) without touching seed rows.

drop policy if exists "israeli_foods_custom_insert" on public.israeli_foods;
create policy "israeli_foods_custom_insert"
  on public.israeli_foods for insert
  with check (true);

drop policy if exists "israeli_foods_custom_update" on public.israeli_foods;
create policy "israeli_foods_custom_update"
  on public.israeli_foods for update
  using (is_system = false)
  with check (is_system = false);
