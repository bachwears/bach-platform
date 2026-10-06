"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { NOT_SAVED } from "../lib/access";
import { HintDot } from "@bach/ui/components/hint-dot";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor, type PhotoMap } from "@bach/ui/lib/photos";

interface Collection {
  id: string;
  slug: string;
  name_en: string;
  is_active: boolean;
  product_collections: Array<{ count: number }>;
}

interface Member {
  product_id: string;
  products: { name_en: string; status: string };
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/** BOSS/Zara-style collections: editorial groups that also power the PDP
 *  "Complete the look" strip — every product in a collection cross-sells
 *  the others automatically. */
export function CollectionsManager() {
  const supabase = supabaseBrowser();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name_en: string; status: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [photos, setPhotos] = useState<PhotoMap | null>(null);

  useEffect(() => {
    void loadFrontPhotos(supabaseBrowser()).then(setPhotos);
  }, []);

  async function load() {
    const { data } = await supabase
      .from("collections")
      .select("id, slug, name_en, is_active, product_collections(count)")
      .order("sort")
      .order("created_at");
    setCollections((data ?? []) as never);
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMembers(cid: string) {
    const { data } = await supabase
      .from("product_collections")
      .select("product_id, products(name_en, status)")
      .eq("collection_id", cid);
    setMembers((data ?? []) as never);
  }

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setErr("");
    const { error } = await supabase
      .from("collections")
      .insert({ name_en: name, name_ar: name, slug: slugify(name) });
    setBusy(false);
    if (error) {
      setErr(`ما مشي الإنشاء: ${error.message}`);
      return;
    }
    setNewName("");
    void load();
  }

  async function search(text: string) {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from("products")
      .select("id, name_en, status")
      .ilike("name_en", `%${text.trim()}%`)
      .limit(8);
    const inCollection = new Set(members.map((m) => m.product_id));
    setResults(((data ?? []) as never as Array<{ id: string; name_en: string; status: string }>).filter((p) => !inCollection.has(p.id)));
  }

  async function add(cid: string, pid: string) {
    const { error } = await supabase.from("product_collections").insert({ collection_id: cid, product_id: pid });
    if (error) setErr(`ما مشي: ${error.message}`);
    setQuery("");
    setResults([]);
    void loadMembers(cid);
    void load();
  }

  async function remove(cid: string, pid: string) {
    await supabase.from("product_collections").delete().eq("collection_id", cid).eq("product_id", pid);
    void loadMembers(cid);
    void load();
  }

  async function toggle(c: Collection) {
    const { data: changed } = await supabase.from("collections").update({ is_active: !c.is_active }).eq("id", c.id).select("id");
    if (!changed?.length) window.alert(NOT_SAVED);
    void load();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end gap-3 border p-5">
        <div className="grid flex-1 gap-1.5">
          <label htmlFor="cname" className="flex items-center gap-2 text-sm font-medium">
            كولكشن جديد (الاسم بالإنكليزي)
            <HintDot
              hint={{
                title: "الكولكشنات",
                what: "مجموعات تنسيقية متل Winter Essentials أو Smart Casual — كل منتجات الكولكشن بتسوّق لبعضها تلقائياً بقسم «Complete the look» على صفحة المنتج.",
                source: "جدول collections + ربط المنتجات بجدول product_collections.",
                edit: "أنشئ الكولكشن، افتحه، وضيف المنتجات بالبحث. عطّله ليختفي من الموقع بلا حذف.",
              }}
            />
          </label>
          <Input id="cname" dir="ltr" value={newName} placeholder="Winter Essentials…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void create()} />
        </div>
        <Button onClick={() => void create()} disabled={busy || !newName.trim()}>
          أنشئ الكولكشن
        </Button>
      </div>

      {err && <p className="bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}

      {collections.length === 0 ? (
        <p className="border p-8 text-center text-sm text-muted-foreground">
          ما في كولكشنات بعد — اكتب اسم فوق (مثلاً Winter Essentials) واكبس «أنشئ الكولكشن».
        </p>
      ) : (
        <div className="space-y-3">
          {collections.map((c) => {
            const count = c.product_collections?.[0]?.count ?? 0;
            const isOpen = open === c.id;
            return (
              <div key={c.id} className="border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 p-4 text-start"
                  onClick={() => {
                    setOpen(isOpen ? null : c.id);
                    if (!isOpen) void loadMembers(c.id);
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span className="font-medium" dir="ltr">{c.name_en}</span>
                    <Badge variant={c.is_active ? "success" : "secondary"}>{c.is_active ? "فعّال" : "مطفي"}</Badge>
                  </span>
                  <span className="text-sm text-muted-foreground">{count} منتج</span>
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t p-4">
                    <div className="relative">
                      <Input
                        dir="ltr"
                        value={query}
                        placeholder="فتّش باسم المنتج لتضيفه…"
                        onChange={(e) => void search(e.target.value)}
                      />
                      {results.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full border bg-background">
                          {results.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-muted/50"
                              onClick={() => void add(c.id, r.id)}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <Thumb src={photoFor(photos, r.id)} size="md" />
                                <span dir="ltr" className="min-w-0 truncate">{r.name_en}</span>
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">{r.status === "published" ? "منشور" : "مسودة"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">الكولكشن فاضي — دوّر على قطعة بالخانة فوق واكبس عليها لتزيدها.</p>
                    ) : (
                      <ul className="divide-y">
                        {members.map((m) => (
                          <li key={m.product_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span className="flex min-w-0 items-center gap-3">
                              <Thumb src={photoFor(photos, m.product_id)} size="md" />
                              <span dir="ltr" className="min-w-0">{m.products.name_en}</span>
                            </span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => void remove(c.id, m.product_id)}
                            >
                              شيل من الكولكشن
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div>
                      <Button variant="ghost" size="sm" onClick={() => void toggle(c)}>
                        {c.is_active ? "طفّي الكولكشن" : "فعّل الكولكشن"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
