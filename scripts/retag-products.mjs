// BOSS-style tag pass (founder request 2026-09-07): every product carries a
// clean, curated tag vocabulary derived from its name + material — nothing
// invented, everything filterable. Tags feed §5 campaign rules and analytics;
// they are not rendered in the UI yet.
//
// Vocabulary (closed set):
//   pattern/finish: striped checked floral printed camouflage embroidered
//                   textured crochet solid washed vintage
//   material:       linen denim leather suede velvet fleece modal nylon oxford fur knit
//   style/detail:   essential sporty utility biker bomber cargo turtleneck
//                   quarter-zip matching-set
// Legacy normalization: check→checked, plain→solid, basic→essential,
//   sport→sporty, coastal→printed; line/brand junk (parallele, hunts) dropped.
//
// Deterministic + rerunnable. Usage:
//   node scripts/retag-products.mjs <products.json> <out.sql>
// products.json: [{id, name, material, fit, tags}]

import fs from "node:fs";

const [, , inFile, outFile] = process.argv;
const products = JSON.parse(fs.readFileSync(inFile, "utf8"));

const VOCAB = new Set([
  "striped", "checked", "floral", "printed", "camouflage", "embroidered",
  "textured", "crochet", "solid", "washed", "vintage",
  "linen", "denim", "leather", "suede", "velvet", "fleece", "modal", "nylon", "oxford", "fur", "knit",
  "essential", "sporty", "utility", "biker", "bomber", "cargo", "turtleneck",
  "quarter-zip", "matching-set",
]);

// old tag → new tag ("" = drop)
const LEGACY = {
  check: "checked", plain: "solid", basic: "essential", sport: "sporty",
  coastal: "printed", parallele: "", hunts: "",
};

// name/material token → tag
const TOKEN = {
  striped: "striped", stripe: "striped", stripes: "striped",
  check: "checked", checked: "checked", checks: "checked",
  floral: "floral", flower: "floral", flowers: "floral",
  print: "printed", printed: "printed",
  camouflage: "camouflage", camo: "camouflage",
  embroidered: "embroidered", embroidery: "embroidered",
  textured: "textured", texture: "textured",
  crochet: "crochet",
  plain: "solid", basic: "essential",
  washed: "washed", wash: "washed",
  vintage: "vintage",
  linen: "linen", denim: "denim", leather: "leather", suede: "suede",
  shamoi: "suede", velvet: "velvet", fleece: "fleece", polar: "fleece",
  modal: "modal", nylon: "nylon", oxford: "oxford", fur: "fur", knit: "knit",
  sport: "sporty", army: "utility", biker: "biker",
  bomber: "bomber", pomber: "bomber", cargo: "cargo",
  turtleneck: "turtleneck", set: "matching-set",
};

const rows = [];
const counts = new Map();
for (const p of products) {
  const tags = new Set();
  for (const t of p.tags ?? []) {
    const k = t.toLowerCase().trim();
    const mapped = k in LEGACY ? LEGACY[k] : k;
    if (mapped && VOCAB.has(mapped)) tags.add(mapped);
  }
  const words = `${p.name ?? ""} ${p.material ?? ""}`.toLowerCase().split(/[^a-z-]+/);
  for (const w of words) if (TOKEN[w]) tags.add(TOKEN[w]);
  if (p.fit === "cargo") tags.add("cargo");
  const list = [...tags].sort();
  for (const t of list) counts.set(t, (counts.get(t) ?? 0) + 1);
  rows.push(`('${p.id}', '{${list.join(",")}}'::text[])`);
}

const sql = `update products p set tags = v.tags, updated_at = now()
from (values
${rows.join(",\n")}
) as v(id, tags)
where p.id = v.id::uuid and p.tags is distinct from v.tags;`;

fs.writeFileSync(outFile, sql);
console.log(`products: ${products.length}`);
console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}(${n})`).join(" "));
