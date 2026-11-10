-- This hook is inactive until explicitly configured in Supabase Auth.
-- Keep this small initial list under review; aliases such as Apple Hide My Email
-- are intentionally not blocked. An exact domain override takes precedence.
create table public.signup_email_domain_rules (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'),
  blocked boolean not null
);

alter table public.signup_email_domain_rules enable row level security;
revoke all on public.signup_email_domain_rules from public, anon, authenticated;

insert into public.signup_email_domain_rules (domain, blocked) values
  ('10minutemail.com', true),
  ('guerrillamail.com', true),
  ('mailinator.com', true),
  ('temp-mail.org', true),
  ('tempmail.com', true),
  ('yopmail.com', true);

create function public.check_signup_email_domain(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_domain text := lower(split_part(trim(coalesce(event -> 'user' ->> 'email', '')), '@', 2));
  is_blocked boolean;
begin
  -- Exact rules permit explicit exceptions for a subdomain; otherwise inherit
  -- the nearest parent rule. Empty email addresses are left to Supabase Auth.
  select r.blocked into is_blocked
    from public.signup_email_domain_rules r
   where email_domain = r.domain or right(email_domain, length(r.domain) + 1) = '.' || r.domain
   order by length(r.domain) desc
   limit 1;

  if coalesce(is_blocked, false) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 400,
      'message', 'We could not create this account. Please use another email address or contact support@tryhomecooked.com.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

revoke all on function public.check_signup_email_domain(jsonb) from public, anon, authenticated;
grant execute on function public.check_signup_email_domain(jsonb) to supabase_auth_admin;
