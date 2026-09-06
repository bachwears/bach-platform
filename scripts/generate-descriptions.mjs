// One-shot content generator: composes description_en (BOSS-tone) and
// description_ar (Lebanese half-formal) for imported products whose
// description is still the name placeholder. Copy derives from parsed
// name attributes + category + fit + material — never invented facts.
//
// Usage: node scripts/generate-descriptions.mjs <products.json> <out-dir>
// products.json: [{id, name, name_ar, cat, fit, material, seasons}]
// Writes: <out-dir>/descriptions.json + <out-dir>/report.txt

import fs from "node:fs";

const [, , inFile, outDir] = process.argv;
const products = JSON.parse(fs.readFileSync(inFile, "utf8"));

// ---------- deterministic rotation ----------
const hash = (s) => [...s].reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 7);
const pick = (arr, seed, salt = 0) => arr[(hash(seed) + salt) % arr.length];

// ---------- category families ----------
const FAMILY = {
  TSH: "tee", TNK: "tank", HEN: "tee", TOP: "tee",
  SH: "shirt", OVS: "shirt",
  SWT: "knit", KNT: "knit", HOD: "knit", SWS: "knit",
  PLO: "polo",
  JKT: "outer", BLZ: "outer", COT: "outer", VST: "outer",
  PNT: "bottom", JNS: "bottom", JOG: "bottom", SHR: "bottom",
  SHO: "shoe",
  ACC: "acc", MSC: "acc",
};

const GARMENT_EN = {
  TSH: "tee", TNK: "tank", HEN: "henley", TOP: "top", SH: "shirt", OVS: "overshirt",
  SWT: "sweater", KNT: "knit", HOD: "hoodie", SWS: "sweatshirt", PLO: "polo",
  JKT: "jacket", BLZ: "blazer", COT: "coat", VST: "vest", PNT: "pair of trousers",
  JNS: "pair of jeans", JOG: "pair of joggers", SHR: "pair of shorts", SHO: "pair",
  ACC: "piece", MSC: "piece",
};
const GARMENT_AR = {
  TSH: "تيشيرت", TNK: "تانك توب", HEN: "هينلي", TOP: "توب", SH: "قميص", OVS: "أوفرشيرت",
  SWT: "كنزة", KNT: "تريكو", HOD: "هودي", SWS: "سويتشيرت", PLO: "بولو",
  JKT: "جاكيت", BLZ: "بليزر", COT: "معطف", VST: "فيست", PNT: "بنطلون",
  JNS: "جينز", JOG: "جوغر", SHR: "شورت", SHO: "صبّاط", ACC: "قطعة", MSC: "قطعة",
};

// ---------- lexicon parsed from names ----------
const LINES = new Set(["marakesh", "markesh", "giesto", "barrier", "vamos", "snazy", "difrancel", "difrances", "defrencel", "defrenced", "kaen", "ers", "irs", "massimo", "huffa", "punch", "mafia", "spezial", "wildchild", "barstate", "nakichli", "nakishli", "relenty", "apres", "gefre", "machinist", "kipchak", "bigosso", "nomarc", "hrdessence", "marselize", "marselise"]);
const BRAND_SKIP = new Set(["adidas", "prada", "zara", "miu", "dior", "lacoste", "converse", "vans", "amiri", "loewe", "alexander", "mcqueen", "golden", "goose", "balance", "gant", "gap", "represent", "airforce", "samba", "boost", "ultra", "new"]);

const COLORS = {
  black: "أسود", white: "أبيض", offwhite: "أوف وايت", grey: "رمادي", green: "أخضر",
  brown: "بني", blue: "أزرق", navy: "كحلي", beige: "بيج", camel: "جملي",
  olive: "زيتي", bordo: "خمري", pordo: "خمري", purple: "موف", negro: "أسود", pistach: "فستقي",
};
const MATERIALS = {
  linen: ["linen", "كتان"], denim: ["denim", "دنيم"], leather: ["leather", "جلد"],
  velvet: ["velvet", "قطيفة"], suede: ["suede", "شامواه"], knit: ["knit", "تريكو"],
  fleece: ["fleece", "فليس"], modal: ["modal", "مودال"], nylon: ["nylon", "نايلون"],
  crochet: ["crochet", "كروشيه"], fur: ["fur trim", "فرو"], polar: ["polar fleece", "فليس"],
  shamoi: ["suede", "شامواه"], oxford: ["oxford cloth", "قماش أوكسفورد"],
};
const FITS = {
  baggy: ["a baggy cut", "بقصّة باغي واسعة"], slim: ["a slim cut", "بقصّة ضيّقة"],
  oversized: ["an oversized cut", "بقصّة أوفرسايز"], cropped: ["a cropped length", "بطول قصير"],
  crop: ["a cropped length", "بطول قصير"], wide: ["a wide leg", "بقصّة واسعة"],
  regular: ["a regular cut", "بقصّة عادية مريحة"], dad: ["a relaxed dad cut", "بقصّة داد مريّحة"],
  boyfriend: ["a relaxed boyfriend cut", "بقصّة بويفرند مريّحة"],
  ballon: ["a balloon leg", "بقصّة بالون"], parachute: ["a parachute cut", "بقصّة باراشوت"],
  cargo: ["a cargo build", "بقصّة كارغو بجيوب"], jorts: ["a denim-short cut", "بقصّة جورتس"],
};
const PATTERNS = {
  striped: ["in a clean stripe", "مقلّم بخطوط واضحة"],
  printed: ["carrying a signature print", "بطبعة مميّزة"],
  plain: ["kept deliberately plain", "سادة عن قصد"],
  floral: ["with a floral print", "بطبعة ورد"], flower: ["with a floral print", "بطبعة ورد"],
  check: ["in a check pattern", "بكاروهات"],
  camouflage: ["in camouflage", "بنقشة مموّهة"],
  embroidered: ["finished with embroidery", "بتطريز شغل ناعم"],
  embroidery: ["finished with embroidery", "بتطريز شغل ناعم"],
  textured: ["with a textured hand", "بملمس محبوك"],
  washed: ["with a lived-in washed finish", "بغسلة معتّقة"],
  vintage: ["with a vintage finish", "بلمسة فينتاج"],
};
const DETAILS = {
  "zip": ["with a full zip", "بسحّاب كامل"],
  "turtleneck": ["with a high neck", "بياخة عالية"],
  "pocket": ["with a chest pocket", "بجيب عالصدر"],
  "pucket": ["with a chest pocket", "بجيب عالصدر"],
  "pockets": ["with working pockets", "بجيوب عملية"],
  "laces": ["with clean lacing", "برباط مرتّب"],
  "belt": ["with its own belt", "مع حزامه"],
  "set": ["sold as a matching set", "طقم كامل متناسق"],
  "army": ["in a utility army style", "بستايل عسكري عملي"],
  "sport": ["built for movement", "بستايل رياضي"],
  "hooded": ["with a hood", "بقبّوسة"],
  "china": ["with a mandarin collar", "بياخة صينية"],
  "chinese": ["with a mandarin collar", "بياخة صينية"],
  "italian": ["with an Italian collar", "بياخة إيطالية"],
  "biker": ["in a biker cut", "بستايل بايكر"],
  "pomber": ["in a bomber cut", "بقصّة بومبر"],
  "elastic": ["with an elastic waist", "بخصر مطاط"],
  "zipper": ["with a full zip", "بسحّاب كامل"],
  "buckle": ["with a buckle", "بإبزيم"],
};

// ---------- copy banks (rotated deterministically per product) ----------
const CLOSER_EN = {
  tee: [
    "Cut to sit right on its own or under an open shirt.",
    "An easy first layer that holds its shape wash after wash.",
    "Wears clean with denim and sharper trousers alike.",
    "The kind of basic the rest of the wardrobe leans on.",
  ],
  tank: [
    "A clean base layer for warm days and gym days both.",
    "Layers under everything, disappears into nothing.",
  ],
  shirt: [
    "Wear it open over a tee or buttoned to the collar.",
    "Sharp enough for evenings, easy enough for every day.",
    "Cut with room to move without losing its line.",
    "The shirt that carries a plan B — smart or laid-back, your call.",
  ],
  knit: [
    "Made for the cold months and the in-between ones.",
    "Soft where it touches, structured where it shows.",
    "Layers cleanly over a tee, under a jacket.",
    "Warmth that doesn't ask you to dress around it.",
  ],
  polo: [
    "The middle ground between a tee and a shirt — better at both jobs.",
    "Collar up or down, it keeps its composure.",
    "Reads polished with trousers, easy with denim.",
  ],
  outer: [
    "The layer that finishes the outfit.",
    "Throw it over anything; it does the rest.",
    "Built to take the season without losing its shape.",
  ],
  bottom: [
    "Sits clean at the waist and breaks right at the shoe.",
    "An everyday pair that doesn't act like one.",
    "Holds its line from morning to the last seat of the day.",
    "Pairs with everything upstairs in the wardrobe.",
  ],
  shoe: [
    "Grounded, comfortable, and easy to reach for daily.",
    "The pair that goes with the whole rack.",
    "Broken-in comfort from the first wear.",
  ],
  acc: [
    "The detail that pulls the look together.",
    "Small piece, finished look.",
  ],
};
const CLOSER_AR = {
  tee: [
    "بتلبسه لحاله أو تحت قميص مفتوح — بالحالتين واقف حاله.",
    "قطعة أساسية بتضل محافظة عشكلها غسلة بعد غسلة.",
    "بيمشي مع الجينز متل ما بيمشي مع بنطلون أنظف.",
    "من القطع يلي بتتّكل عليها باقي الخزانة.",
  ],
  tank: [
    "طبقة أولى نظيفة لأيام الشوب وأيام الجيم.",
    "بينلبس تحت كل شي وما بيبيّن تحت ولا شي.",
  ],
  shirt: [
    "البسه مفتوح فوق تيشيرت أو مسكّر عالياخة — عالسهرة وعالنهار.",
    "أنيق للسهرة وساهل لكل يوم.",
    "قصّة فيها مجال تتحرك بدون ما يخسر خطّه.",
    "قميص بيمشي رسمي أو كاجوال — القرار إلك.",
  ],
  knit: [
    "معمول لشهور البرد ولليالي يلي بيناتهن.",
    "ناعم عاللمس، مرتّب عالنظر.",
    "بينلبس فوق تيشيرت وتحت جاكيت بدون تعقيد.",
    "دفا بدون ما يجبرك تلبس عأساسه.",
  ],
  polo: [
    "نص طريق بين التيشيرت والقميص — وأحسن من التنين بشغلهن.",
    "الياخة لفوق أو لتحت، بيضل محافظ عهيبته.",
    "بيطلع أنيق مع بنطلون قماش وسهل مع الجينز.",
  ],
  outer: [
    "الطبقة يلي بتكمّل الطلّة.",
    "ارميه فوق أي شي — هو بيظبّط الباقي.",
    "معمول يتحمّل الموسم بدون ما يخسر شكله.",
  ],
  bottom: [
    "قصّة نظيفة عالخصر وبتوقف صح عالصبّاط.",
    "بنطلون كل يوم، بس ما بيبيّن هيك.",
    "بيحافظ عخطّه من الصبح لآخر قعدة بالليل.",
    "بيمشي مع كل يلي فوق بالخزانة.",
  ],
  shoe: [
    "مريح، ثابت، وبتمد إيدك عليه كل يوم.",
    "الجوز يلي بيمشي مع كل الخزانة.",
    "راحة من أول لبسة، بلا فترة تعويد.",
  ],
  acc: [
    "التفصيلة يلي بتجمع الطلّة.",
    "قطعة صغيرة، طلّة كاملة.",
  ],
};

// ---------- composition ----------
const report = [];
const out = [];
for (const p of products) {
  const seed = p.id;
  const cat = p.cat ?? "MSC";
  const family = FAMILY[cat] ?? "acc";
  const tokens = p.name.toLowerCase().split(/[\s\/\-]+/).map((t) => t.replace(/[^a-z0-9']/g, "")).filter(Boolean);
  const unknown = [];

  let line = null, material = null, fitPhrase = null, colorEn = null, colorAr = null;
  const patternPhrases = [];
  const detailPhrases = [];

  // fit column first (authoritative)
  if (p.fit && FITS[p.fit.toLowerCase()]) fitPhrase = FITS[p.fit.toLowerCase()];
  if (p.material) {
    const key = p.material.toLowerCase().split(" ")[0];
    material = MATERIALS[key] ?? [p.material.toLowerCase(), p.material];
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (LINES.has(t)) { line = p.name.split(/[\s\/\-]+/)[i]; continue; }
    if (BRAND_SKIP.has(t)) continue;
    if (COLORS[t]) { colorEn = t; colorAr = COLORS[t]; continue; }
    if (MATERIALS[t]) { if (!material) material = MATERIALS[t]; continue; }
    if (FITS[t]) { if (!fitPhrase) fitPhrase = FITS[t]; continue; }
    if (PATTERNS[t]) { patternPhrases.push(PATTERNS[t]); continue; }
    if (DETAILS[t]) { detailPhrases.push(DETAILS[t]); continue; }
    // garment/common words we deliberately ignore
    if (/^(tshirt|t|shirts?|chemise|sweater|jacket|polo|jeans?|pants?|trousers?|troesers|shorts?|top|tank|henley|hoodie|sweatshirt|sweatpants?|jogger|joggerman|knit|cardigan|coat|blazer|vest|overshirt|shoes?|boots?|loafer|mokasine|espadrel|sandals?|sleepers|cap|belt|body|with|the|and|of|for|on|in|up|neck|fit|old|full|open|mix|quarter|round|roung|half|classic|basic|essentials?|new|super|zip|zipup)$/.test(t)) continue;
    if (/^(dark|leg|v)$/.test(t)) continue;
    unknown.push(p.name.split(/[\s\/\-]+/)[i]);
  }

  const patterns = patternPhrases.slice(0, 2);
  const details = detailPhrases.slice(0, 1);
  const model = unknown.slice(0, 3).join(" ").trim() || null;

  // ----- EN -----
  const garmentEn = GARMENT_EN[cat] ?? "piece";
  const bitsEn = [];
  if (material) bitsEn.push(`in ${material[0]}`);
  for (const ph of patterns) bitsEn.push(ph[0]);
  for (const d of details) bitsEn.push(d[0]);
  if (colorEn && bitsEn.length < 3) bitsEn.push(`in ${colorEn === "offwhite" ? "off-white" : colorEn}`);
  const OPENERS_EN = ["A considered", "A clean-cut", "A well-made", "An easy"];
  let s1en;
  if (model) {
    s1en = `The ${model} ${garmentEn}`;
    if (fitPhrase) s1en += `, cut with ${fitPhrase[0].replace(/^an? /, "a ")}`;
  } else {
    s1en = fitPhrase
      ? `A ${garmentEn} with ${fitPhrase[0]}`
      : `${pick(OPENERS_EN, seed, 2)} ${garmentEn}`;
  }
  if (bitsEn.length) s1en += `, ${bitsEn.join(", ")}`;
  if (line) s1en += ` — from the ${line} line`;
  s1en += ".";
  const descEn = `${s1en} ${pick(CLOSER_EN[family], seed)}`;

  // ----- AR -----
  const garmentAr = GARMENT_AR[cat] ?? "قطعة";
  const bitsAr = [];
  if (material) bitsAr.push(material[1] === "دنيم" || material[1] === "تريكو" || material[1] === "فليس" || material[1] === "كتان" || material[1] === "جلد" || material[1] === "شامواه" || material[1] === "قطيفة" ? `من ال${material[1]}` : `من قماش ${material[1]}`);
  if (fitPhrase) bitsAr.push(fitPhrase[1]);
  for (const ph of patterns) bitsAr.push(ph[1]);
  for (const d of details) bitsAr.push(d[1]);
  if (colorAr && bitsAr.length < 4) bitsAr.push(`بلون ${colorAr}`);
  let s1ar = model ? `${garmentAr} ${model}` : `${garmentAr}`;
  if (bitsAr.length) s1ar += ` ${bitsAr.join("، ")}`;
  else if (!model) s1ar += ` ${pick(["مدروس بكل تفصيلة", "بخط نظيف وبسيط", "معمول ليضل معك موسم بعد موسم", "بشغل مرتّب وواضح"], seed, 3)}`;
  if (line) s1ar += ` — من مجموعة ${line}`;
  s1ar += ".";
  const descAr = `${s1ar} ${pick(CLOSER_AR[family], seed, 1)}`;

  out.push({ id: p.id, name: p.name, description_en: descEn, description_ar: descAr });
  if (unknown.length) report.push(`${p.name} [${cat}] → unknown: ${unknown.join(", ")}`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/descriptions.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${outDir}/report.txt`, report.join("\n"));
console.log(`generated ${out.length} · ${report.length} products with unknown tokens (see report.txt)`);
