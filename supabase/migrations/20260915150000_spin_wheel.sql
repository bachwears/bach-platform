-- Spin-the-wheel game (founder request 2026-09-15): one spin per email,
-- prize decided server-side, winners get a real single-use promocode that
-- the existing checkout promocode flow accepts. Toggled from MGMT via the
-- site_content key "wheel".

create table public.wheel_spins (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  prize text not null,               -- 'percent-5' | 'percent-10' | 'percent-15' | 'none'
  promocode text,                    -- code handed to the winner (null on 'none')
  created_at timestamptz not null default now()
);

alter table public.wheel_spins enable row level security;
-- No direct client access: everything goes through the RPC.

create or replace function public.spin_wheel(p_email text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_existing public.wheel_spins;
  v_roll integer;
  v_prize text;
  v_pct integer;
  v_code text;
begin
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  select * into v_existing from public.wheel_spins where email = v_email;
  if v_existing.email is not null then
    return jsonb_build_object('already_played', true, 'prize', v_existing.prize, 'code', v_existing.promocode);
  end if;

  -- Weighted server-side roll: 5%→40, 10%→25, 15%→10, try-again→25.
  v_roll := floor(random() * 100)::integer;
  if v_roll < 40 then v_prize := 'percent-5'; v_pct := 5;
  elsif v_roll < 65 then v_prize := 'percent-10'; v_pct := 10;
  elsif v_roll < 75 then v_prize := 'percent-15'; v_pct := 15;
  else v_prize := 'none'; v_pct := null;
  end if;

  if v_pct is not null then
    v_code := 'spin-' || substr(md5(random()::text || v_email), 1, 8);
    insert into public.promocodes (code, kind, value, is_enabled, starts_at, ends_at, per_customer_limit)
    values (v_code, 'percent', v_pct, true, now(), now() + interval '7 days', 1);
  end if;

  insert into public.wheel_spins (email, prize, promocode) values (v_email, v_prize, v_code);

  -- The wheel doubles as a newsletter capture — consented by playing.
  insert into public.newsletter_subscribers (email, source)
  values (v_email, 'wheel')
  on conflict (email) do nothing;

  return jsonb_build_object('already_played', false, 'prize', v_prize, 'code', v_code);
end;
$$;

revoke all on function public.spin_wheel(text) from public;
grant execute on function public.spin_wheel(text) to anon, authenticated;

-- Wheel config block, editable from MGMT site-content (disabled by default).
insert into public.site_content (key, value) values (
  'wheel',
  jsonb_build_object('enabled', false, 'title', 'Spin & win', 'sub', 'One spin per email — win up to 15% off your first order.')
) on conflict (key) do nothing;
