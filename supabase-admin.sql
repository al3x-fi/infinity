-- INFINITY admin wallet tracker: run once in Supabase → SQL Editor (safe to re-run).
-- Only accounts listed in admin_users can read or change anything here. Everyone else,
-- signed in or not, gets nothing: Row Level Security is on for every table.

-- 1. Who is an admin. No policies, so only the SQL Editor can change this list.
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Tracked wallets. Addresses are stored checksummed, so (network, address) is unique.
create table if not exists public.admin_wallets (
  id           bigint generated always as identity primary key,
  network      text not null check (network in ('mainnet', 'sepolia')),
  address      text not null check (address ~ '^0x[0-9a-fA-F]{40}$'),
  label        text not null default '' check (length(label) <= 100),
  tags         text[] not null default '{}',
  notes        text not null default '' check (length(notes) <= 5000),
  ens          text,
  is_contract  boolean,
  delegated    boolean,               -- EIP-7702 wallet
  last_checked timestamptz,
  last_error   text,
  added_by     uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (network, address)
);

-- 3. Balance history. A row is added only when the balance or transaction count changed.
--    wei is text because balances overflow JavaScript numbers.
create table if not exists public.admin_wallet_snapshots (
  id         bigint generated always as identity primary key,
  wallet_id  bigint not null references public.admin_wallets(id) on delete cascade,
  checked_at timestamptz not null default now(),
  wei        text not null check (wei ~ '^[0-9]{1,78}$'),
  nonce      bigint not null check (nonce >= 0)
);
create index if not exists admin_wallet_snapshots_wallet_idx on public.admin_wallet_snapshots (wallet_id, checked_at desc);

alter table public.admin_wallets enable row level security;
alter table public.admin_wallet_snapshots enable row level security;

drop policy if exists "admins only" on public.admin_wallets;
create policy "admins only" on public.admin_wallets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins only" on public.admin_wallet_snapshots;
create policy "admins only" on public.admin_wallet_snapshots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.admin_users, public.admin_wallets, public.admin_wallet_snapshots from anon;

-- 4. Save one balance check. Runs as the caller, so the policies above still apply.
--    Locks the wallet row so two admins refreshing at once cannot add duplicate snapshots.
create or replace function public.record_wallet_check(
  p_wallet_id bigint, p_wei text, p_nonce bigint, p_is_contract boolean, p_delegated boolean
) returns json language plpgsql security invoker set search_path = public as $$
declare
  v_wei   text;
  v_nonce bigint;
  v_now   timestamptz := now();
  v_changed boolean;
begin
  update admin_wallets
     set last_checked = v_now, last_error = null, is_contract = p_is_contract, delegated = p_delegated
   where id = p_wallet_id;
  if not found then raise exception 'wallet % not found', p_wallet_id; end if;

  select wei, nonce into v_wei, v_nonce from admin_wallet_snapshots
   where wallet_id = p_wallet_id order by checked_at desc, id desc limit 1;

  v_changed := not found or v_wei <> p_wei or v_nonce <> p_nonce;
  if v_changed then
    insert into admin_wallet_snapshots (wallet_id, checked_at, wei, nonce) values (p_wallet_id, v_now, p_wei, p_nonce);
  end if;
  return json_build_object('changed', v_changed, 'checked_at', v_now);
end;
$$;
revoke all on function public.record_wallet_check(bigint, text, bigint, boolean, boolean) from public;
grant execute on function public.record_wallet_check(bigint, text, bigint, boolean, boolean) to authenticated;

-- 5. Make yourself an admin (after creating your user under Authentication → Users):
--    insert into public.admin_users (user_id) select id from auth.users where email = 'you@example.com';
