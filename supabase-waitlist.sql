-- INFINITY waitlist: run once in Supabase → SQL Editor.
-- The table is locked down (RLS on, no policies). The public site can only call the two functions below.

create table if not exists public.waitlist (
  id         bigint generated always as identity primary key,
  email      text not null unique,
  code       text not null unique,
  ref_code   text,
  created_at timestamptz not null default now()
);
create index if not exists waitlist_ref_code_idx on public.waitlist (ref_code);
alter table public.waitlist enable row level security;

-- Status for one referral code (no emails are ever returned).
create or replace function public.get_waitlist_status(p_code text)
returns json language sql security definer set search_path = public as $$
  with s as (
    select w.code, w.created_at,
           (select count(*) from waitlist r where r.ref_code = w.code) as refs
    from waitlist w
  ),
  p as (select code, created_at, refs, 10 + 50 * refs as pts from s),
  me as (select * from p where code = p_code)
  select json_build_object(
    'code',     me.code,
    'points',   me.pts,
    'refs',     me.refs,
    'position', 1 + (select count(*) from p
                     where p.pts > me.pts or (p.pts = me.pts and p.created_at < me.created_at)),
    'total',    (select count(*) from p)
  ) from me;
$$;

-- Join (or re-fetch if the email already exists). +10 for joining, +50 per referral.
create or replace function public.join_waitlist(p_email text, p_ref text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_code  text;
  v_ref   text;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'invalid email';
  end if;

  select code into v_code from waitlist where email = v_email;

  if v_code is null then
    if p_ref is not null and exists (select 1 from waitlist where code = p_ref) then
      v_ref := p_ref;
    end if;
    loop
      v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 7);
      exit when not exists (select 1 from waitlist where code = v_code);
    end loop;
    insert into waitlist (email, code, ref_code) values (v_email, v_code, v_ref);
  end if;

  return get_waitlist_status(v_code);
end;
$$;

revoke all on function public.get_waitlist_status(text) from public;
revoke all on function public.join_waitlist(text, text) from public;
grant execute on function public.get_waitlist_status(text) to anon;
grant execute on function public.join_waitlist(text, text) to anon;

-- To export emails later: Table Editor → waitlist → Export, or  select * from waitlist order by created_at;
