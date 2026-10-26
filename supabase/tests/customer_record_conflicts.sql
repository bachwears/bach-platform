-- 20261027090000_customer_record_conflicts. Rolled back.
do $$
declare br uuid; v uuid; a uuid; r record; o record; uid uuid := gen_random_uuid(); g uuid; got uuid;
begin
  select id into br from branches where is_active order by created_at limit 1;
  select pv.id into v from product_variants pv join products p on p.id = pv.product_id
  join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
  where pv.is_active and p.status = 'published' and not exists (select 1 from outfit_items oi where oi.product_id = p.id) limit 1;
  update inventory_levels set quantity = quantity + 5 where variant_id = v and branch_id = br;
  perform set_config('app.customer_guard_bypass', 'on', true);
  insert into customers (full_name, phone, email) values ('Known', '+96170111222', 'known.test@example.com') returning id into a;
  perform set_config('app.customer_guard_bypass', '', true);

  -- 1. a guest with that email (any case) and a new phone: the order goes through, on that record, untouched
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  drop table if exists _web;
  select * into r from storefront_checkout(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    'Someone', '+96170999888', 'Beirut', 'Hamra', null, 'Known.Test@Example.com');
  select * into o from orders where id = r.order_id;
  if o.customer_id <> a then raise exception 'TESTFAIL not joined to the known customer'; end if;
  if (select phone from customers where id = a) <> '+96170111222' then raise exception 'TESTFAIL known customer edited'; end if;

  -- 2. first sign-in with the email of a guest record: that record is linked, once
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'guest.link@example.com', now(), '{"full_name":"G"}', now(), now());
  perform set_config('app.customer_guard_bypass', 'on', true);
  insert into customers (full_name, phone, email) values ('Guest', '+96170333444', 'guest.link@example.com') returning id into g;
  perform set_config('app.customer_guard_bypass', '', true);
  perform set_config('request.jwt.claims', '{"sub":"' || uid || '","role":"authenticated"}', true);
  got := my_customer_id();
  if got <> g or (select auth_user_id from customers where id = g) <> uid then raise exception 'TESTFAIL guest not linked'; end if;
  if my_customer_id() <> g then raise exception 'TESTFAIL second call'; end if;

  -- 3. a new account whose email nobody has: a fresh record
  uid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'brand.new@example.com', now(), '{}', now(), now());
  perform set_config('request.jwt.claims', '{"sub":"' || uid || '","role":"authenticated"}', true);
  got := my_customer_id();
  if got is null or (select email from customers where id = got) <> 'brand.new@example.com' then raise exception 'TESTFAIL new record'; end if;
end $$;
