"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

/** One entry of the shared colour list (table colours). */
export interface Colour {
  code: string;
  name_en: string;
  name_ar: string;
  hex: string | null;
  hex2: string | null;
  family: string | null;
}

const FAMILY_AR: Record<string, string> = {
  Black: "أسود",
  White: "أبيض",
  Grey: "رمادي",
  Blue: "أزرق",
  Green: "أخضر",
  Beige: "بيج",
  Brown: "بني",
  Red: "أحمر",
  Pink: "وردي",
  Orange: "برتقالي",
  Yellow: "أصفر",
};
const FAMILIES = Object.keys(FAMILY_AR);

export function Swatch({ c, className = "h-5 w-5" }: { c: Pick<Colour, "hex" | "hex2"> | null; className?: string }) {
  const bg = !c?.hex
    ? undefined
    : c.hex2
      ? `linear-gradient(135deg, ${c.hex} 50%, ${c.hex2} 50%)`
      : c.hex;
  return <span aria-hidden className={`inline-block shrink-0 border border-black/15 ${className}`} style={{ background: bg ?? "transparent" }} />;
}

let cache: Colour[] | null = null;
/** The colour list, read once per page. */
export function useColours() {
  const [list, setList] = useState<Colour[]>(cache ?? []);
  const reload = async () => {
    const { data } = await supabaseBrowser()
      .from("colours")
      .select("code, name_en, name_ar, hex, hex2, family")
      .eq("is_active", true)
      .order("name_en");
    cache = (data ?? []) as Colour[];
    setList(cache);
    return cache;
  };
  useEffect(() => {
    if (!cache) void reload();
  }, []);
  return { colours: list, reload };
}

/** A free three-letter code: first letters of the words, then other letters. */
function suggestCode(name: string, taken: Set<string>): string {
  const letters = name.toUpperCase().replace(/[^A-Z/ ]/g, "");
  const words = letters.split(/[ /]+/).filter(Boolean);
  const tries: string[] = [];
  const flat = words.join("");
  if (words.length >= 2) tries.push((words[0]![0]! + words[1]!.slice(0, 2)).padEnd(3, "X"), (words[0]!.slice(0, 2) + words[1]![0]!).padEnd(3, "X"));
  tries.push(flat.slice(0, 3).padEnd(3, "X"));
  for (let i = 1; i < flat.length - 1; i++) for (let j = i + 1; j < flat.length; j++) tries.push(flat[0]! + flat[i]! + flat[j]!);
  for (const t of tries) if (/^[A-Z]{3}$/.test(t) && !taken.has(t)) return t;
  for (let n = 0; n < 26 * 26; n++) {
    const t = (flat[0] ?? "C") + String.fromCharCode(65 + Math.floor(n / 26)) + String.fromCharCode(65 + (n % 26));
    if (!taken.has(t)) return t;
  }
  return "";
}

/**
 * Pick a colour from the shared list: type to search (English, Arabic or code),
 * swatches grouped by family so shades sit together. Two-tone pieces pick a
 * second colour. A missing colour can be added right here — once — with its
 * code, Arabic name, swatch and family, so nobody types the same colour twice.
 */
export function ColourPicker({ value, onChange }: { value: Colour | null; onChange: (c: Colour | null) => void }) {
  const { colours, reload } = useColours();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t
      ? colours.filter((c) => c.name_en.toLowerCase().includes(t) || c.name_ar.includes(q.trim()) || c.code.toLowerCase() === t)
      : colours;
    const groups = new Map<string, Colour[]>();
    for (const c of list) {
      const f = c.name_en.includes("/") ? "Two-tone" : (c.family ?? "Other");
      groups.set(f, [...(groups.get(f) ?? []), c]);
    }
    return [...groups.entries()].sort(([a], [b]) => (a === "Two-tone" ? 1 : b === "Two-tone" ? -1 : FAMILIES.indexOf(a) - FAMILIES.indexOf(b)));
  }, [colours, q]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2 border bg-transparent px-3 text-start text-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <>
            <Swatch c={value} />
            <span dir="ltr">{value.name_en}</span>
            <span className="text-muted-foreground">{value.name_ar}</span>
            <span className="ms-auto font-mono text-xs text-muted-foreground" dir="ltr">
              {value.code}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">اختار لون…</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-72 border bg-background">
          <div className="border-b p-2">
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر: Navy، كحلي، NAV…" />
          </div>
          <div className="max-h-72 overflow-y-auto" role="listbox">
            {hits.map(([fam, list]) => (
              <div key={fam}>
                <p className="bg-muted/60 px-3 py-1 text-xs text-muted-foreground">{fam === "Two-tone" ? "لونين" : (FAMILY_AR[fam] ?? fam)}</p>
                {list.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    role="option"
                    aria-selected={value?.code === c.code}
                    onClick={() => {
                      onChange(c);
                      setOpen(false);
                      setQ("");
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted ${value?.code === c.code ? "bg-muted" : ""}`}
                  >
                    <Swatch c={c} />
                    <span dir="ltr">{c.name_en}</span>
                    <span className="text-muted-foreground">{c.name_ar}</span>
                    <span className="ms-auto font-mono text-xs text-muted-foreground" dir="ltr">
                      {c.code}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {!hits.length && <p className="p-3 text-sm text-muted-foreground">ما لقينا هاللون.</p>}
          </div>
          <div className="border-t p-2">
            {adding ? (
              <NewColour
                colours={colours}
                initialName={q}
                onCancel={() => setAdding(false)}
                onAdded={async (c) => {
                  await reload();
                  onChange(c);
                  setAdding(false);
                  setOpen(false);
                  setQ("");
                }}
              />
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="w-full px-1 py-1 text-start text-sm underline underline-offset-4">
                + لون جديد مش موجود
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NewColour({
  colours,
  initialName,
  onAdded,
  onCancel,
}: {
  colours: Colour[];
  initialName: string;
  onAdded: (c: Colour) => void | Promise<void>;
  onCancel: () => void;
}) {
  const taken = useMemo(() => new Set(colours.map((c) => c.code)), [colours]);
  const [twoTone, setTwoTone] = useState(false);
  const [first, setFirst] = useState<Colour | null>(null);
  const [second, setSecond] = useState<Colour | null>(null);
  const [v, setV] = useState({
    name_en: /[a-z]/i.test(initialName) ? initialName.trim().replace(/\b\w/g, (m) => m.toUpperCase()) : "",
    name_ar: /[ء-ي]/.test(initialName) ? initialName.trim() : "",
    hex: "#8c8c8c",
    family: "Grey",
    code: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // two-tone: built from two colours of the list
  const name_en = twoTone && first && second ? `${first.name_en}/${second.name_en}` : v.name_en.trim();
  const name_ar = twoTone && first && second ? `${first.name_ar}, ${second.name_ar}` : v.name_ar.trim();
  const code = v.code || suggestCode(name_en, taken);
  const dup = colours.find((c) => c.name_en.toLowerCase() === name_en.toLowerCase());

  async function save() {
    setErr("");
    if (dup) return setErr(`موجود من قبل: ${dup.name_en} (${dup.code}) — اختارو من اللائحة.`);
    if (!name_en || !name_ar) return setErr("اكتب الاسم بالإنكليزي والعربي.");
    if (!/^[A-Z]{3}$/.test(code)) return setErr("الكود لازم يكون 3 أحرف إنكليزي كبيرة.");
    if (taken.has(code)) return setErr(`الكود ${code} مستعمل — اختار غيرو.`);
    const row: Colour = {
      code,
      name_en,
      name_ar,
      hex: twoTone ? (first?.hex ?? null) : v.hex,
      hex2: twoTone ? (second?.hex ?? null) : null,
      family: twoTone ? (first?.family ?? null) : v.family,
    };
    setBusy(true);
    const { error } = await supabaseBrowser().from("colours").insert(row);
    setBusy(false);
    if (error) return setErr(error.code === "23505" ? "هاللون أو الكود موجود من قبل." : `ما انحفظ: ${error.message}`);
    await onAdded(row);
  }

  return (
    <div className="space-y-2 text-sm">
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={twoTone} onChange={(e) => setTwoTone(e.target.checked)} className="accent-foreground" />
        لونين بقطعة وحدة (متل Beige/Blue)
      </label>
      {twoTone ? (
        <div className="grid gap-2">
          <ColourPicker value={first} onChange={setFirst} />
          <ColourPicker value={second} onChange={setSecond} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Input dir="ltr" placeholder="Sage Green" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} />
          <Input placeholder="أخضر فاتح" value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            لون العيّنة
            <input type="color" value={v.hex} onChange={(e) => setV({ ...v, hex: e.target.value })} className="h-8 w-10 cursor-pointer border" />
          </label>
          <select
            value={v.family}
            onChange={(e) => setV({ ...v, family: e.target.value })}
            className="h-9 border bg-transparent px-2 text-xs"
            aria-label="عيلة اللون"
          >
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                درجة من: {FAMILY_AR[f]}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">الكود</span>
        <Input
          dir="ltr"
          maxLength={3}
          value={code}
          onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
          className="h-8 w-20 font-mono"
        />
        {name_en && <Swatch c={{ hex: twoTone ? (first?.hex ?? null) : v.hex, hex2: twoTone ? (second?.hex ?? null) : null }} />}
        <span className="truncate text-xs" dir="ltr">
          {name_en}
        </span>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
          {busy ? "عم نحفظ…" : "زيد اللون"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          رجوع
        </Button>
      </div>
    </div>
  );
}

/** Size presets as tap-to-pick chips; custom sizes typed into the box. */
const SIZE_SETS: Array<[string, string[]]> = [
  ["ملابس", ["XS", "S", "M", "L", "XL", "XXL", "3XL"]],
  ["قياس واحد", ["One Size"]],
  ["صبابيط", ["39", "40", "41", "42", "43", "44", "45", "46"]],
  ["بناطيل", ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40"]],
];

export function SizePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState("");
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  return (
    <div className="space-y-2">
      {SIZE_SETS.map(([label, sizes]) => (
        <div key={label} className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={value.includes(s)}
              onClick={() => toggle(s)}
              className={`h-8 min-w-10 border px-2 text-xs ${value.includes(s) ? "border-foreground bg-foreground text-background" : "hover:border-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          dir="ltr"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="مقاس تاني…"
          className="h-8 w-32"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const s = custom.trim().toUpperCase();
              if (s && !value.includes(s)) onChange([...value, s]);
              setCustom("");
            }
          }}
        />
        {value.length > 0 && (
          <span className="text-xs text-muted-foreground" dir="ltr">
            {value.join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}
