-- The shipped email's details table already shows what's due (or that it's
-- paid); the body no longer repeats it.
update public.notification_templates
set body = 'Good news {{customer_name}} — order #{{order_number}} has been dispatched. The courier will contact you. — BACH Wears',
    updated_at = now()
where event = 'order_shipped' and channel = 'email' and lang = 'en'
  and body like '%{{due_note}}%';
