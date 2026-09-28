create table if not exists public.household_inventory (
  id text primary key,
  household_id text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

update public.household_inventory
set household_id = id
where household_id is null;

alter table public.household_inventory
  alter column household_id set not null;

create unique index if not exists household_inventory_household_id_key
  on public.household_inventory (household_id);

alter table public.household_inventory enable row level security;

comment on column public.household_inventory.household_id is
'业务租户标识；同一个 Supabase Project 内不同房屋/网页项目必须使用唯一值。';

drop policy if exists "allow anon shared household access" on public.household_inventory;
create policy "allow anon shared household access"
on public.household_inventory
for all
to anon
using (true)
with check (true);
