create or replace view public.inventory_items_view
with (security_invoker = true)
as
select
  h.household_id,
  item.id as item_id,
  item.name,
  item.category,
  item.location,
  item.quantity,
  item.unit,
  item.track_stock,
  item.min_quantity,
  case
    when item.track_stock and item.quantity <= item.min_quantity then true
    else false
  end as needs_replenish,
  item.note,
  item.updated_by,
  item.updated_at,
  h.updated_at as household_updated_at
from public.household_inventory h
cross join lateral jsonb_to_recordset(coalesce(h.payload -> 'items', '[]'::jsonb)) as raw_item(
  id text,
  name text,
  category text,
  location text,
  quantity numeric,
  unit text,
  "trackStock" boolean,
  "minQuantity" numeric,
  note text,
  "updatedBy" text,
  "updatedAt" timestamptz
)
cross join lateral (
  select
    raw_item.id,
    raw_item.name,
    raw_item.category,
    raw_item.location,
    coalesce(raw_item.quantity, 0) as quantity,
    raw_item.unit,
    coalesce(raw_item."trackStock", false) as track_stock,
    coalesce(raw_item."minQuantity", 0) as min_quantity,
    raw_item.note,
    raw_item."updatedBy" as updated_by,
    raw_item."updatedAt" as updated_at
) item;

create or replace view public.inventory_replenish_view
with (security_invoker = true)
as
select *
from public.inventory_items_view
where needs_replenish = true
order by updated_at desc nulls last;

create or replace view public.inventory_locations_view
with (security_invoker = true)
as
select
  household_id,
  location,
  count(*) as item_count,
  string_agg(name, ', ' order by name) as items
from public.inventory_items_view
group by household_id, location
order by location;

grant select on public.inventory_items_view to anon;
grant select on public.inventory_replenish_view to anon;
grant select on public.inventory_locations_view to anon;
