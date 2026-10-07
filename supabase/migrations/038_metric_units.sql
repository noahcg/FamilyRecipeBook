-- Per-viewer display preference; recipe ingredient values remain unchanged.
alter table public.user_settings
  add column metric_units boolean not null default false;
