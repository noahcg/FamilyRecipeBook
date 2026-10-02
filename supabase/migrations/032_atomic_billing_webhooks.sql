-- Event effects and acknowledgement commit together. Only the server may execute this RPC.
alter table public.billing_accounts add column source_subscription_observed_at timestamptz;

create or replace function public.apply_billing_webhook(
  target_event_id text, target_event_type text, target_livemode boolean,
  target_event_created timestamptz, subscription_data jsonb default null,
  payment_customer_id text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  account public.billing_accounts;
  event_status text;
  customer_id text;
begin
  insert into public.billing_webhook_events(event_id, event_type, livemode)
  values(target_event_id, target_event_type, target_livemode)
  on conflict(event_id) do nothing;
  select processing_status into event_status from public.billing_webhook_events
  where event_id = target_event_id for update;
  if event_status = 'processed' then return false; end if;

  if subscription_data is not null then
    customer_id := subscription_data->>'stripe_customer_id';
    -- Lock the local customer mapping, never accept metadata as authorization.
    select * into account from public.billing_accounts where stripe_customer_id = customer_id for update;
    if not found then raise exception 'Subscription has no trusted local customer mapping'; end if;
    if (account.source_subscription_observed_at is null
      or account.source_subscription_observed_at < (subscription_data->>'observed_at')::timestamptz)
      and not (account.stripe_subscription_id is not null
        and account.stripe_subscription_id <> subscription_data->>'stripe_subscription_id'
        and account.source_event_created_at > target_event_created) then
      update public.billing_accounts set
        plan = subscription_data->>'plan', status = subscription_data->>'status',
        stripe_subscription_id = subscription_data->>'stripe_subscription_id',
        stripe_price_id = subscription_data->>'stripe_price_id',
        current_period_start = (subscription_data->>'current_period_start')::timestamptz,
        current_period_end = (subscription_data->>'current_period_end')::timestamptz,
        cancel_at_period_end = (subscription_data->>'cancel_at_period_end')::boolean,
        canceled_at = (subscription_data->>'canceled_at')::timestamptz,
        source_event_id = target_event_id, source_event_created_at = target_event_created,
        source_subscription_observed_at = (subscription_data->>'observed_at')::timestamptz,
        updated_at = now()
      where user_id = account.user_id;
    end if;
  elsif target_event_type = 'invoice.paid' then
    -- Payment failure does not erase a historical successful payment.
    update public.billing_accounts set last_payment_at = target_event_created, updated_at = now()
    where stripe_customer_id = payment_customer_id
      and (last_payment_at is null or last_payment_at < target_event_created);
    if not exists(select 1 from public.billing_accounts where stripe_customer_id = payment_customer_id) then
      raise exception 'Invoice has no trusted local customer mapping';
    end if;
  end if;
  update public.billing_webhook_events set processing_status = 'processed', processed_at = now(), error_message = null
  where event_id = target_event_id;
  return true;
end;
$$;
revoke all on function public.apply_billing_webhook(text,text,boolean,timestamptz,jsonb,text) from public, anon, authenticated;
grant execute on function public.apply_billing_webhook(text,text,boolean,timestamptz,jsonb,text) to service_role;
