alter table public.recipe_books
  add column share_card_recipe_id uuid references public.recipes(id) on delete set null,
  add column share_card_photo_url text;

-- Enforce the relationship even when a keeper writes through the API directly.
create function public.check_cookbook_share_card_recipe() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.share_card_recipe_id is null then
    new.share_card_photo_url := null;
    return new;
  end if;
  if new.share_card_recipe_id is not null and not exists (
    select 1 from public.recipes r
    where r.id = new.share_card_recipe_id and r.book_id = new.id
      and r.photo_url is not null and not r.moderation_hidden
  ) then
    raise exception 'Choose a visible recipe with a photo from this cookbook.';
  end if;
  select r.photo_url into new.share_card_photo_url from public.recipes r where r.id = new.share_card_recipe_id and r.book_id = new.id;
  return new;
end;
$$;
create trigger check_cookbook_share_card_recipe
  before insert or update of share_card_recipe_id, share_card_photo_url on public.recipe_books
  for each row execute function public.check_cookbook_share_card_recipe();
