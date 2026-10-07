-- Help Center update 2026-10-07: photo matching rebuilt, Special Prices now
-- includes everything on sale, product delete, shop switches (colour cards,
-- product strip), plus a customer article on Special Prices and the product page.
-- Upsert by slug; safe to re-run.
do $$
begin
  update public.help_articles set
    body_ar = $ar$«مطابقة الصور» للصور يلّي انرفعت بلا منتج. بتشتغل قطعة قطعة:
- فوق: «قطعة 3 من 143» مع «السابقة» و«التالية». القطع يلّي إلها اقتراح لمنتج بلا صور بيطلعوا أول، لأنهن الأهم.
- عاليمين: صور القطعة كبيرة وبلا قصّ. كبسة عالصورة بتكبّرها عالشاشة كلها (الأسهم أو الكيبورد بيتنقّلوا بين الصور). تحت كل صورة صغيرة «مش معهم» إذا الصورة مش من نفس القطعة. وتحتهن اسم الملف ولونو.
- عالشمال: لايحة القطع مفتوحة دايمًا. المقترحة من اسم الملف فوق («نفس الكود» = أكيد)، وتحتها كل القطع مع بحث بالاسم أو الكود أو اللون، أزرار الفئات، و«بس القطع يلّي بعدها بلا صور». كل قطعة بصورتها وألوانها.
- كبسة عالقطعة الصح (بتصير «✓ مختارة»)، تأكّد من «لون الصور عالموقع» (تعبّى من اسم الملف، وفيك تغيّرو)، وبعدين «اربط». بتنتقل لحالها عالقطعة يلّي بعدها.
- إذا لون الصور مش من ألوان القطعة، بيطلع تنبيه أصفر وهالصور بتتعلّم «ما تربطهم» وبتضل ناطرة — إلا إذا اخترت إلها لون.
- القطعة يلّي ما إلها صور بتاخد أول صورة قدّام وضهر بخاناتهن، والباقي «إضافية». القطعة يلّي إلها صور ما بيتبدّل شي فيها، بس بينزادو.
- «مكرّرة / مش لازمة — خبّيها» بتشيل الصور من اللايحة بس بتضل محفوظة بمجلد ignored. «بعدين» بتأجّل القطعة لآخر اللايحة.
تعديل خانة أو لون صورة مربوطة من قبل بيصير من صفحة المنتج، قسم «الصور حسب اللون».$ar$,
    body_en = $en$Photo matching handles photos uploaded without a product, one piece at a time.
- Top: "Piece 3 of 143" with Previous / Next. Pieces that likely belong to a product with no photos come first.
- Right: the piece's photos, large and uncropped. Tap to view full screen (arrows or keyboard move between photos). "Not with them" under a thumbnail leaves that photo out. The file name and colour are shown below.
- Left: the product list is always open. Suggestions from the file name come first ("same code" = certain), then every product, with search by name, code or colour, category buttons and "only pieces without photos". Each product shows its photo and colours.
- Tap the right product (it shows "✓ selected"), check "colour of the photos on the site" (filled from the file name, editable), then Link. The next piece opens by itself.
- If the photos' colour isn't one of the product's colours, a yellow warning shows and those photos are set to "don't link" and stay waiting, unless you choose a colour for them.
- A product with no photos gets the first front and back shots in those slots; the rest go in as extras. A product that already has photos only gets new ones added.
- "Duplicate / not needed — hide" removes the photos from the list; they stay in storage (folder ignored). "Later" moves the piece to the end.
Changing the slot or colour of a photo that's already linked is done on the product page, under Photos by colour.$en$,
    updated_at = now()
  where slug = 'mgmt-media-match';

  update public.help_articles set
    body_ar = body_ar
      || $ar$
SPECIAL PRICES بتجمع القطع المعلّمة «بيّنها بـ Special Prices» وكل قطعة عليها سعر تخفيض. الرابط الوردي آخر شي بقائمة الموقع، تحت |05|، وبيبيّن أوّل ما يكون في قطعة وحدة من الاتنين.
محي منتج: بآخر صفحة المنتج في مربّع أحمر «محي المنتج» (للمدير العام ومدير المحل). إذا المنتج ما إلو أي تاريخ — ما انباع، ما إلو مرتجعات، ولا طلبيّة شراء، ولا جرد، ولا ستوك — بيظهر زر «امحي المنتج نهائيًا» (الصور بتضل بالستورج، والمحي بينسجّل). إذا إلو تاريخ، المربّع بيقلّك ليش وما بيمحيه: غيّر «الحالة» لـ «مؤرشف» ليتخبّى عن الموقع لـ دايمًا، أو «مسودة» لفترة.$ar$,
    body_en = body_en
      || $en$
SPECIAL PRICES gathers the pieces ticked «بيّنها بـ Special Prices» plus every piece with a sale price. Its pink link is the last item in the website menu, below |05|, and shows as soon as one such piece exists.
Deleting a product: at the bottom of the product page there's a red "Delete product" box (super admin and store manager). If the product has no history — never sold, returned, ordered from a supplier, counted or stocked — "Delete the product for good" appears (photo files stay in storage; the delete is logged). If it has history the box says why and won't delete: set Status to Archived to hide it from the website for good, or Draft for a while.$en$,
    updated_at = now()
  where slug = 'mgmt-products' and body_ar not like '%محي منتج%';

  update public.help_articles set
    body_ar = body_ar
      || $ar$
مفاتيح بتشتغل لحالها (بلا «حفظ التغييرات»، بتبيّن خلال دقيقة):
- «الكولكشنز عالموقع»: بتخفي كل الكولكشنز (تبويبها بالقائمة، صورها، وصفحاتها).
- «كل الألوان بالشوب»: كل لون إلو صورو بيطلع بكرت لحالو بالشوب، مخلوطين بين القطع (الترتيب بيتغيّر كل يوم) مش ورا بعض. الكبسة عالكرت بتفتح القطعة عهاللون.
- «شريط القطع بصفحة المنتج»: شريط صور صغيرة لقطع نفس الفئة فوق زر ADD عالموبايل. شيل العلامة لتخبّيه.
- «صورة المشاركة»: الصورة يلّي بتطلع لمّا حدا يبعت رابط الموقع.
صورة الواجهة إلها نسخة للكمبيوتر (عرضية) ونسخة للموبايل (طولية)، وكل صورة بالموقع بتتبدّل من هون أو من صفحة الفئة أو الكولكشن.$ar$,
    body_en = body_en
      || $en$
Switches that save on their own (no Save button; live within a minute):
- Collections on the website: hides every collection (menu tab, home tiles and pages).
- All colours in the shop: each colour with its own photos gets its own card in the shop, mixed between pieces (the order reshuffles daily) rather than side by side. Tapping the card opens the piece in that colour.
- Product strip on the product page: the row of small photos of the same category above ADD on phones. Untick to hide it.
- Share image: the picture shown when someone shares a link to the site.
The home hero has a desktop (landscape) and a phone (portrait) image; every image on the site is replaced here or on its category or collection page.$en$,
    updated_at = now()
  where slug = 'mgmt-site-content' and body_ar not like '%كل الألوان بالشوب%';

  insert into public.help_articles (slug, category, title_en, title_ar, body_en, body_ar, audiences, sort, is_published)
  values (
    'special-prices-product-page',
    'Orders',
    'Special Prices and the product page',
    'الأسعار المميّزة وصفحة القطعة',
    $en$SPECIAL PRICES, the last link in the menu, gathers our selected pieces and everything currently reduced. Reduced pieces show the new price, the old price crossed out and the saving.
On a piece's page, the colour squares switch the photos to that colour. Tap ADD to choose your size: sizes we're out of are crossed out, and "Notify me" tells you when one is back. On a phone, swipe the photo sideways to move to the next or previous piece in the same category.$en$,
    $ar$SPECIAL PRICES، آخر رابط بالقائمة، فيها القطع المختارة وكل شي عليه تخفيض هلّق. القطعة المخفّضة بتبيّن بسعرها الجديد والقديم مشطوب ونسبة التوفير.
بصفحة القطعة، مربّعات الألوان بتبدّل الصور لهاللون. كبسة ADD لتختار المقاس: المقاسات الخالصة مشطوبة، و«خبّرني» بيبعتلك لمّا يرجع. عالموبايل، اسحب الصورة عالجنب لتروح عالقطعة يلّي بعدها أو قبلها بنفس الفئة.$ar$,
    array['customer'],
    16,
    true
  )
  on conflict (slug) do update set
    title_en = excluded.title_en, title_ar = excluded.title_ar,
    body_en = excluded.body_en, body_ar = excluded.body_ar,
    category = excluded.category, audiences = excluded.audiences,
    is_published = true, updated_at = now();
end $$;
