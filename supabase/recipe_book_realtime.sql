-- Applied on RecipeApp (ywrzbdmebqmdnmsiczno) only.
-- Do not run against the nutrition project — israeli_foods stays untouched.

alter table public.recipes replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'recipes'
  ) then
    alter publication supabase_realtime add table public.recipes;
  end if;
end $$;
