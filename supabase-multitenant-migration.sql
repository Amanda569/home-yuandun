-- 多租户迁移脚本：适用于已有 household_inventory 表的 Supabase Project。
-- 执行前请先在 Supabase Dashboard -> Database -> Backups 或 SQL Editor 导出备份。

begin;

alter table public.household_inventory
  add column if not exists household_id text;

-- 兼容旧版本：旧表用 id 保存租户标识，迁移时直接复制到新字段。
update public.household_inventory
set household_id = id
where household_id is null;

do $$
begin
  if exists (
    select 1
    from public.household_inventory
    where household_id is null
  ) then
    raise exception 'household_id 仍存在 NULL，未完成迁移';
  end if;
end $$;

alter table public.household_inventory
  alter column household_id set not null;

create unique index if not exists household_inventory_household_id_key
  on public.household_inventory (household_id);

comment on column public.household_inventory.household_id is
'业务租户标识；同一个 Supabase Project 内不同房屋/网页项目必须使用唯一值。';

commit;

-- 校验：应返回每个租户一行，且 household_id、id 不为空。
select id, household_id, updated_at
from public.household_inventory
order by household_id;

-- 新租户初始化示例（按实际值替换，执行前确认不存在同名租户）：
-- insert into public.household_inventory (id, household_id, payload)
-- values ('new-house-id', 'new-house-id', '{}'::jsonb);
