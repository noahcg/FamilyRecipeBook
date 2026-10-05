-- Keep an immediate refund downgrade durable across late subscription webhooks.
-- A later, distinct paid subscription may grant Plus again.
alter table public.billing_accounts
  add column refunded_subscription_id text,
  add column refunded_at timestamptz;

create table public.billing_refunds (
  subscription_id text primary key,
  user_id uuid not null references public.profiles(id),
  customer_id text not null,
  invoice_id text not null,
  payment_intent_id text not null unique,
  refund_id text not null unique,
  amount integer not null check (amount > 0),
  currency text not null,
  actor_id uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);
alter table public.billing_refunds enable row level security;
-- Service role only. Customer billing details do not belong in the browser.
revoke all on public.billing_refunds from public, anon, authenticated;
grant select, insert on public.billing_refunds to service_role;

create or replace function public.complete_billing_refund(
  target_user_id uuid, target_subscription_id text, target_customer_id text,
  target_invoice_id text, target_payment_intent_id text, target_refund_id text,
  target_amount integer, target_currency text, target_actor_id uuid, target_reason text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare account public.billing_accounts;
begin
  select * into account from public.billing_accounts where user_id = target_user_id for update;
  if not found or account.stripe_customer_id is distinct from target_customer_id
    or account.stripe_subscription_id is distinct from target_subscription_id then
    raise exception 'Billing account changed; reconcile before completing refund';
  end if;
  insert into public.billing_refunds(subscription_id,user_id,customer_id,invoice_id,payment_intent_id,refund_id,amount,currency,actor_id,reason)
  values(target_subscription_id,target_user_id,target_customer_id,target_invoice_id,target_payment_intent_id,target_refund_id,target_amount,target_currency,target_actor_id,target_reason)
  on conflict(subscription_id) do nothing;
  if not found then
    if not exists(select 1 from public.billing_refunds where subscription_id = target_subscription_id
      and payment_intent_id = target_payment_intent_id and refund_id = target_refund_id) then
      raise exception 'Conflicting refund record';
    end if;
    return false;
  end if;
  update public.billing_accounts set plan = 'free', status = 'canceled',
    cancel_at_period_end = false, canceled_at = now(), current_period_end = now(),
    refunded_subscription_id = target_subscription_id, refunded_at = now(), updated_at = now()
  where user_id = target_user_id;
  insert into public.admin_actions(actor_id, action, target_type, target_id, summary, metadata)
  values(target_actor_id,'refund_plus_subscription','user',target_user_id::text,
    'Refunded Plus and ended access',jsonb_build_object(
      'customerId',target_customer_id,'subscriptionId',target_subscription_id,
      'invoiceId',target_invoice_id,'paymentIntentId',target_payment_intent_id,
      'refundId',target_refund_id,'amount',target_amount,'currency',target_currency,
      'previousStatus',account.status,'resultingStatus','canceled','reason',target_reason));
  return true;
end;
$$;
revoke all on function public.complete_billing_refund(uuid,text,text,text,text,text,integer,text,uuid,text) from public, anon, authenticated;
grant execute on function public.complete_billing_refund(uuid,text,text,text,text,text,integer,text,uuid,text) to service_role;

-- Copy the existing atomic handler and add the refund guard inside its locked row.
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
    select * into account from public.billing_accounts where stripe_customer_id = customer_id for update;
    if not found then raise exception 'Subscription has no trusted local customer mapping'; end if;
    if account.refunded_subscription_id is distinct from subscription_data->>'stripe_subscription_id'
      and (account.source_subscription_observed_at is null
        or account.source_subscription_observed_at < (subscription_data->>'observed_at')::timestamptz)
      and not (account.stripe_subscription_id is not null
        and account.stripe_subscription_id <> subscription_data->>'stripe_subscription_id'
        and coalesce(account.source_event_created_at > target_event_created, false)) then
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
