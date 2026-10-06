"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Select } from "@bach/ui/components/select";
import { Textarea } from "@bach/ui/components/textarea";

import { NOT_SAVED } from "../lib/access";

export interface HelpArticle {
  id?: string;
  slug: string;
  category: string;
  sort: number;
  audiences: string[];
  is_published: boolean;
  title_ar: string;
  body_ar: string;
  title_en: string;
  body_en: string;
}

// Customer categories have storefront headings; staff ones group the portals' help.
const CATEGORIES = ["Orders", "Payment", "Returns", "Account", "Perks", "Support", "Staff", "POS", "Management"];
const AUDIENCES: Array<[string, string]> = [
  ["customer", "الزبائن (الموقع)"],
  ["all_staff", "كل الموظفين"],
  ["cashier", "كاشير"],
  ["store_manager", "مدير المحل"],
  ["inventory_manager", "مسؤول المخزون"],
  ["support_agent", "خدمة الزبائن"],
  ["marketing_manager", "مسؤول التسويق"],
];
const AUD_LABEL = Object.fromEntries(AUDIENCES);

const BLANK: HelpArticle = {
  slug: "",
  category: "Orders",
  sort: 100,
  audiences: ["customer"],
  is_published: false,
  title_ar: "",
  body_ar: "",
  title_en: "",
  body_en: "",
};

export function HelpArticlesEditor({ articles }: { articles: HelpArticle[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<HelpArticle | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const shown = useMemo(
    () => articles.filter((a) => filter === "all" || (filter === "draft" ? !a.is_published : a.audiences.includes(filter))),
    [articles, filter],
  );

  function open(a: HelpArticle | null) {
    setDraft(a ? { ...a } : { ...BLANK, sort: Math.max(0, ...articles.map((x) => x.sort)) + 1 });
    setErr("");
    setMsg("");
  }

  async function save() {
    if (!draft) return;
    const d = { ...draft, slug: draft.slug.trim().toLowerCase() };
    if (!/^[a-z0-9-]+$/.test(d.slug)) return setErr("الرابط (slug) لازم يكون أحرف إنكليزي صغيرة وأرقام و- بس.");
    if (!d.title_ar.trim() || !d.body_ar.trim() || !d.title_en.trim() || !d.body_en.trim())
      return setErr("العنوان والنص لازم يكونوا بالعربي والإنكليزي.");
    if (!d.audiences.length) return setErr("اختار مين بيشوف المقالة.");
    setBusy(true);
    setErr("");
    const supabase = supabaseBrowser();
    const row = {
      slug: d.slug,
      category: d.category,
      sort: d.sort,
      audiences: d.audiences,
      is_published: d.is_published,
      title_ar: d.title_ar.trim(),
      body_ar: d.body_ar.trim(),
      title_en: d.title_en.trim(),
      body_en: d.body_en.trim(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = d.id
      ? await supabase.from("help_articles").update(row).eq("id", d.id).select("id")
      : await supabase.from("help_articles").insert(row).select("id");
    setBusy(false);
    if (error) {
      setErr(error.code === "23505" ? "هالرابط (slug) مستعمل لمقالة تانية." : `ما انحفظت: ${error.message}`);
      return;
    }
    if (!data?.length) {
      setErr(NOT_SAVED);
      return;
    }
    setMsg(d.is_published ? "انحفظت ومنشورة." : "انحفظت كمسودة (مش منشورة).");
    setDraft(null);
    router.refresh();
  }

  if (draft) {
    const set = <K extends keyof HelpArticle>(k: K, v: HelpArticle[K]) => setDraft({ ...draft, [k]: v });
    return (
      <div className="space-y-5 border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{draft.id ? "تعديل مقالة" : "مقالة جديدة"}</h2>
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
            → ارجع للائحة
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="slug">الرابط (slug)</Label>
            <Input id="slug" dir="ltr" value={draft.slug} disabled={!!draft.id} onChange={(e) => set("slug", e.target.value)} placeholder="delivery" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat">القسم</Label>
            <Select id="cat" value={draft.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort">الترتيب</Label>
            <Input id="sort" dir="ltr" type="number" value={draft.sort} onChange={(e) => set("sort", parseInt(e.target.value || "0", 10))} />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">مين بيشوفها</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {AUDIENCES.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draft.audiences.includes(key)}
                  onChange={(e) =>
                    set("audiences", e.target.checked ? [...draft.audiences, key] : draft.audiences.filter((a) => a !== key))
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">السوبر أدمن بيشوف كل المقالات.</p>
        </fieldset>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tar">العنوان بالعربي (الكاشير والإدارة)</Label>
              <Input id="tar" value={draft.title_ar} onChange={(e) => set("title_ar", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bar">النص بالعربي</Label>
              <Textarea id="bar" rows={10} value={draft.body_ar} onChange={(e) => set("body_ar", e.target.value)} />
            </div>
          </div>
          <div className="space-y-3" dir="ltr">
            <div className="space-y-2">
              <Label htmlFor="ten">Title in English (website)</Label>
              <Input id="ten" value={draft.title_en} onChange={(e) => set("title_en", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ben">Text in English</Label>
              <Textarea id="ben" rows={10} value={draft.body_en} onChange={(e) => set("body_en", e.target.value)} />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">سطر جديد بالنص بيبيّن سطر جديد. ما في إيموجي.</p>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={draft.is_published} onChange={(e) => set("is_published", e.target.checked)} />
          منشورة (بتبيّن هلّق)
        </label>

        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "عم نحفظ…" : "احفظ المقالة"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => open(null)}>
          + مقالة جديدة
        </Button>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto" aria-label="فلتر المقالات">
          <option value="all">الكل ({articles.length})</option>
          <option value="draft">مسودات</option>
          {AUDIENCES.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
      {shown.length === 0 ? (
        <p className="border p-8 text-center text-sm text-muted-foreground">
          {articles.length === 0
            ? "ما في مقالات بعد — اكبس «+ مقالة جديدة» لتكتب أول وحدة."
            : "ما في مقالات بهالفلتر — اختار «الكل» لتشوف كل المقالات."}
        </p>
      ) : null}
      <ul className="divide-y border empty:hidden">
        {shown.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => open(a)} className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-start hover:bg-muted/50">
              <span>
                <span className="font-medium">{a.title_ar}</span>
                <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                  {a.slug}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-1">
                {!a.is_published && <Badge variant="outline">مسودة</Badge>}
                {a.audiences.map((x) => (
                  <Badge key={x} variant="secondary">
                    {AUD_LABEL[x] ?? x}
                  </Badge>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
