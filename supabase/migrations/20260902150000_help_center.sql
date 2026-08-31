-- Help Center (§11): role-scoped articles written from day one, plus the
-- ?-hint registry. Visibility is enforced server-side via RLS.

create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category text not null,
  title_en text not null,
  title_ar text not null,
  body_en text not null,
  body_ar text not null,
  -- 'customer' | 'all_staff' | specific app_role values
  audiences text[] not null default '{customer}',
  sort integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.hint_registry (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title_ar text not null,
  what_ar text not null,
  source_ar text not null,   -- where the data comes from
  edit_ar text not null,     -- where to edit it
  article_slug text references public.help_articles (slug)
);

alter table public.help_articles enable row level security;
alter table public.hint_registry enable row level security;

create or replace function public._can_read_article(p_audiences text[])
returns boolean language sql stable security definer set search_path = public as $$
  select
    'customer' = any(p_audiences)
    or (public.is_staff() and 'all_staff' = any(p_audiences))
    or coalesce(public.current_app_role()::text = any(p_audiences), false)
    or public.current_app_role() = 'super_admin'
$$;

create policy "role scoped article reads" on public.help_articles
  for select to anon, authenticated
  using (is_published and public._can_read_article(audiences));

create policy "content managers write articles" on public.help_articles
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'marketing_manager'));

create policy "staff read hints" on public.hint_registry
  for select to authenticated using (public.is_staff());
create policy "admins manage hints" on public.hint_registry
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'marketing_manager'));

-- ============ Customer articles ============
insert into public.help_articles (slug, category, sort, audiences, title_en, title_ar, body_en, body_ar) values

('how-to-order', 'Orders', 1, '{customer}',
'How to place an order', 'كيف بعمل طلب أونلاين',
'Browse the collection, pick your size and color, and add pieces to your bag. At checkout, enter your name, phone number, and delivery address — no account needed. We will call you to confirm before dispatching. Payment is cash on delivery: you pay when your order arrives, in USD or LBP at our posted exchange rate.',
'تصفّح المجموعة، اختار القياس واللون، وضيف القطع عالشنتة. بالـcheckout حط اسمك ورقم تلفونك وعنوان التوصيل — ما في داعي لحساب. منتصل فيك نأكد قبل ما نبعت الطلب. الدفع كاش عند الاستلام: بتدفع لما يوصل طلبك، بالدولار أو بالليرة على سعر الصرف المعتمد عنا.'),

('cash-on-delivery', 'Payment', 2, '{customer}',
'Cash on delivery & currencies', 'الدفع عند الاستلام والعملات',
'We currently accept cash on delivery. You can pay in US dollars, Lebanese pounds, or a mix of both — the courier applies our posted exchange rate from the day of your order. Card payments (Visa/Mastercard) and Whish are coming soon.',
'حالياً منقبل الدفع كاش عند الاستلام. فيك تدفع دولار أو ليرة أو الاتنين سوا — المندوب بيعتمد سعر الصرف المعلن عنا يوم طلبك. الدفع بالبطاقة (فيزا/ماستركارد) وويش جايين قريباً.'),

('order-tracking', 'Orders', 3, '{customer}',
'Tracking your order', 'متابعة طلبك',
'Create an account (or sign in) and open My Account to see every order and its live status: Placed, Confirmed, Being prepared, Ready, On its way, Delivered. We also send WhatsApp updates when your order ships and arrives.',
'اعمل حساب (أو سجّل دخول) وافتح My Account لتشوف كل طلباتك وحالتها لحظة بلحظة: جديد، مؤكّد، قيد التجهيز، جاهز، بالطريق، وصل. وكمان منبعتلك تحديثات عالواتساب لما يتشحن طلبك ولما يوصل.'),

('returns-policy', 'Returns', 4, '{customer}',
'Returns & exchanges', 'المرتجع والتبديل',
'Not the right fit? Bring the piece with its invoice to the store, or contact us to arrange a pickup. You can exchange for other pieces and pay only the difference, or get a cash refund of what you actually paid — including any discount you used. Items should be unworn with tags attached.',
'ما ظبط القياس؟ جيب القطعة مع الفاتورة عالمحل، أو تواصل معنا لننسّق الاستلام. فيك تبدّل بقطع تانية وتدفع بس الفرق، أو تسترجع كاش المبلغ يلي دفعتو فعلياً — مع أي خصم كنت مستعملو. القطع لازم تكون غير ملبوسة مع التيكات.'),

('my-account', 'Account', 5, '{customer}',
'Your BACH account', 'حسابك عند BACH',
'An account shows your full order history, your customer-since date, and unlocks member perks. Create one right after checkout — your details carry over. Set your birthday once in My Account and a gift code arrives every year around your day.',
'الحساب بيفرجيك كل طلباتك، من إيمتا صرت زبون عنا، وبيفتحلك مزايا الأعضاء. اعملو مباشرة بعد الطلب — معلوماتك بتنتقل لحالها. حط عيد ميلادك مرة وحدة بحسابك، وكل سنة بيوصلك كود هدية حوالين يومك.'),

('birthday-gift', 'Perks', 6, '{customer}',
'Your birthday gift', 'هدية عيد ميلادك',
'Members with a birthday saved get 15% off everything with code MYBIRTHDAY, valid for a few days around their birthday, once a year. Sign in, make sure your birthday is set in My Account, and the code applies at checkout automatically when you enter it.',
'الأعضاء يلي محفوظ عيد ميلادهم بياخدوا 15% خصم على كل شي بكود MYBIRTHDAY، صالح كم يوم حوالين عيد ميلادهم، مرة بالسنة. سجّل دخول، تأكد إنو عيد ميلادك محطوط بحسابك، وحط الكود بالـcheckout.'),

('contact-us', 'Support', 7, '{customer}',
'Contact us', 'تواصل معنا',
'WhatsApp or call us on +961 71 566 296 — we answer during store hours. You can also reach us at care@bachwears.com. For order issues, keep your order number handy.',
'واتساب أو اتصال على 296 566 71 961+ — منرد خلال دوام المحل. أو راسلنا على care@bachwears.com. لأي موضوع بطلب، خلّي رقم الطلب معك.'),

-- ============ Staff articles ============
('pos-selling', 'POS', 10, '{cashier,store_manager}',
'POS: selling', 'الكاشير: البيع',
'Scan the barcode (or search by SKU/name), the piece lands in the cart. Apply a percent discount if approved. Take payment in USD, LBP, or mixed — the screen shows the change in LBP. Complete the sale and print the invoice. Stock updates instantly.',
'امسح الباركود (أو فتّش بالـSKU أو الاسم) والقطعة بتفوت عالسلة. حط خصم نسبة إذا موافق عليه. اقبض دولار أو ليرة أو مختلط — الشاشة بتفرجيك الباقي بالليرة. سجّل البيع واطبع الفاتورة. المخزون بيتحدّث فوراً.'),

('pos-returns', 'POS', 11, '{cashier,store_manager}',
'POS: returns & exchanges', 'الكاشير: المرتجع والتبديل',
'Open مرتجع/تبديل, type the invoice number, and pick the pieces coming back — the screen computes the exact refund based on what was paid, including discounts. For exchanges, scan the new pieces; the screen tells you who pays the difference and in which direction. Stock moves automatically both ways.',
'افتح مرتجع/تبديل، اكتب رقم الفاتورة، وحدّد القطع الراجعة — الشاشة بتحسب المبلغ المظبوط حسب يلي ان دفع فعلياً، مع الخصومات. للتبديل، امسح القطع الجديدة؛ الشاشة بتقلك مين بيدفع الفرق ولأي جهة. المخزون بيتحرّك لحالو بالاتجاهين.'),

('pos-queue', 'POS', 12, '{cashier,store_manager,support_agent}',
'POS: online orders queue', 'الكاشير: طلبات الأونلاين',
'Online orders appear in طلبات الأونلاين the moment a customer checks out. Call to confirm, then advance the order: confirm → prepare → pack (stock is deducted here) → hand to courier → delivered. Cancelling before packing releases the reserved stock. The customer gets WhatsApp updates on shipping and delivery.',
'طلبات الأونلاين بتبيّن بـطلبات الأونلاين لحظة ما الزبون يطلب. اتصل تأكّد، وبعدين قدّم الطلب: أكّد ← جهّز ← وضّب (هون بينخصم المخزون) ← سلّم للمندوب ← وصل. الإلغاء قبل التوضيب بيرجّع المخزون المحجوز. الزبون بياخد تحديثات واتساب عالشحن والوصول.'),

('pos-eod', 'POS', 13, '{cashier,store_manager}',
'POS: end of day', 'الكاشير: تسكير اليوم',
'Open تسكير اليوم after the last sale. The screen shows expected drawer cash in USD and LBP (sales in, refunds out). Count the drawer, enter both amounts, and close — variance is recorded and the day locks. Print the branded report and sign it with the manager.',
'افتح تسكير اليوم بعد آخر بيعة. الشاشة بتفرجيك الكاش المفروض يكون بالدرج دولار وليرة (المبيعات ناقص المرتجعات). عدّ الدرج، فوّت الرقمين، وسكّر — الفرق بينسجّل واليوم بيقفل. اطبع التقرير ووقّعو مع المدير.'),

('mgmt-products', 'Management', 20, '{store_manager,inventory_manager,marketing_manager}',
'Managing products', 'إدارة المنتجات',
'Products live in المنتجات: names in both languages, prices, category, variants with auto-generated SKUs and barcodes. صحة البيانات shows exactly what each product is missing before it is publish-ready. Upload photos in bulk via الصور — name files SKU_front.jpg / _back / _side / _closeup and they attach themselves.',
'المنتجات موجودة بـالمنتجات: أسماء باللغتين، أسعار، فئة، وفاريانتس بأرقام SKU وباركود أوتوماتيك. صحة البيانات بتفرجيك شو ناقص بكل منتج قبل ما يكون جاهز للنشر. ارفع الصور دفعة وحدة من الصور — سمّي الملفات SKU_front.jpg / _back / _side / _closeup وبيتوصّلوا لحالهم.'),

('mgmt-rate', 'Management', 21, '{store_manager}',
'The exchange rate', 'سعر الصرف',
'سعر الصرف sets the LBP/USD rate used everywhere: POS, storefront, and reports. Changes apply immediately to new sales; past invoices keep the rate they were made at. Jumps over 20% ask for a confirming tap. Only the super admin and store manager can change it.',
'سعر الصرف بيحدد سعر الليرة/دولار المعتمد بكل مكان: الكاشير، المتجر، والتقارير. التغيير بيمشي فوراً عالمبيعات الجديدة؛ الفواتير القديمة بتحتفظ بسعرها. أي قفزة فوق 20% بتطلب تأكيد. بس السوبر أدمن ومدير المحل بيقدروا يغيّروه.'),

('mgmt-orders', 'Management', 22, '{store_manager,support_agent}',
'Orders & the daily numbers', 'الطلبات وأرقام اليوم',
'الطلبات lists every sale from both the store and the website, with today''s totals and expected drawer cash split by currency. Open any order for its items, payments, and the exchange rate captured at sale time. Managers can move orders along their allowed status path.',
'الطلبات بتعرض كل بيعة من المحل والموقع، مع مجاميع اليوم والكاش المتوقع بالدرج مفصول حسب العملة. افتح أي طلب لتشوف قطعو ودفعاتو وسعر الصرف يلي انسجّل وقت البيع. المدراء بيقدروا يحرّكوا الطلب حسب المسار المسموح.');

-- ============ Hints (?-circles) ============
insert into public.hint_registry (key, title_ar, what_ar, source_ar, edit_ar, article_slug) values
('eod-expected-cash', 'الكاش المتوقع',
 'المبلغ يلي المفروض يكون بالدرج: كل الكاش المقبوض اليوم ناقص المرتجعات المدفوعة.',
 'من دفعات مبيعات الكاشير ومرتجعات اليوم، لكل عملة لحال.',
 'ما بينحرّر يدوياً — بيتصحح لحالو مع كل بيعة أو مرتجع.', 'pos-eod'),
('rate-current', 'السعر الحالي',
 'سعر صرف الليرة مقابل الدولار المعتمد بكل المنصة هلق.',
 'آخر سعر مسجّل بسجل أسعار الصرف.',
 'من شاشة سعر الصرف — سوبر أدمن أو مدير المحل.', 'mgmt-rate'),
('health-score', 'نسبة الجهوزية',
 'نسبة المنتجات المكتملة البيانات (صور، مقاسات، وصف عربي، فئة...).',
 'من فحص تلقائي لكل منتج على 12 نقطة.',
 'كمّل البيانات الناقصة من صفحة كل منتج وبترتفع النسبة.', 'mgmt-products');
