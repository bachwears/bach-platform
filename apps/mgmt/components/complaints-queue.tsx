"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Select } from "@bach/ui/components/select";
import { Textarea } from "@bach/ui/components/textarea";

const STATUS_AR: Record<string, string> = {
  open: "جديدة",
  in_progress: "قيد المعالجة",
  waiting_customer: "بانتظار الزبون",
  escalated: "مصعّدة",
  resolved: "محلولة",
  closed: "مسكّرة",
};

const NEXT_STATUSES: Record<string, string[]> = {
  open: ["in_progress", "escalated", "resolved"],
  in_progress: ["waiting_customer", "escalated", "resolved"],
  waiting_customer: ["in_progress", "resolved", "closed"],
  escalated: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

interface Complaint {
  id: string;
  number: number;
  name: string;
  phone: string;
  email: string | null;
  order_number: number | null;
  subject: string;
  body: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
  complaint_events: Array<{ kind: string; body: string; is_public: boolean; created_at: string; author_id: string | null }>;
}

export function ComplaintsQueue({ myId }: { myId: string }) {
  const supabase = supabaseBrowser();
  const [filter, setFilter] = useState<string>("active");
  const [items, setItems] = useState<Complaint[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notePublic, setNotePublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    let q = supabase
      .from("complaints")
      .select("*, profiles!complaints_assigned_to_fkey(full_name), complaint_events(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter === "active") q = q.not("status", "in", '("resolved","closed")');
    else if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems((data ?? []) as unknown as Complaint[]);
  }, [supabase, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusy(true);
    const { error: err } = await supabase.from("complaints").update({ status }).eq("id", id);
    setBusy(false);
    if (err) setError(`ما مشي التحديث: ${err.message}`);
    else void load();
  }

  async function assignToMe(id: string) {
    setBusy(true);
    const { error: err } = await supabase.from("complaints").update({ assigned_to: myId }).eq("id", id);
    setBusy(false);
    if (err) setError(`ما مشي التعيين: ${err.message}`);
    else void load();
  }

  async function addNote(id: string) {
    if (!note.trim()) return;
    setBusy(true);
    const { error: err } = await supabase.from("complaint_events").insert({
      complaint_id: id,
      author_id: myId,
      kind: notePublic ? "reply" : "note",
      body: note.trim(),
      is_public: notePublic,
    });
    setBusy(false);
    if (err) setError(`ما انحفظت الملاحظة: ${err.message}`);
    else {
      setNote("");
      void load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["active", "المفتوحة"],
          ["escalated", "المصعّدة"],
          ["resolved", "المحلولة"],
          ["all", "الكل"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k!)}
            className={`rounded-full border px-3 py-1 ${filter === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

      {items.length === 0 ? (
        <p className="p-10 text-center text-muted-foreground">ما في شكاوى هون. 🖤</p>
      ) : (
        items.map((c) => (
          <div key={c.id} className="rounded-lg border p-4">
            <button type="button" className="w-full text-right" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">#{c.number}</span>
                  <Badge variant={["resolved", "closed"].includes(c.status) ? "secondary" : "default"}>
                    {STATUS_AR[c.status] ?? c.status}
                  </Badge>
                  <span className="text-sm">{c.subject}</span>
                </div>
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {new Date(c.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {c.name} · <span dir="ltr">{c.phone}</span>
                {c.order_number ? ` · طلب #${c.order_number}` : ""}
                {c.profiles?.full_name ? ` · معيّنة لـ${c.profiles.full_name}` : " · بلا تعيين"}
              </p>
            </button>

            {openId === c.id && (
              <div className="mt-4 space-y-4 border-t pt-4">
                <p className="whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm">{c.body}</p>

                {c.complaint_events.length > 0 && (
                  <ul className="space-y-2 text-sm">
                    {[...c.complaint_events]
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                      .map((e, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${e.is_public ? "bg-green-500" : "bg-muted-foreground"}`} />
                          <div>
                            <p className="whitespace-pre-line">
                              {e.kind === "status" ? `حالة: ${e.body}` : e.kind === "assign" ? `تعيين: ${e.body}` : e.body}
                              {e.is_public && <span className="mr-2 text-xs text-green-600 dark:text-green-400">(ظاهر للزبون)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground" dir="ltr">
                              {new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}

                <div className="space-y-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="ملاحظة داخلية أو ردّ للزبون…" />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                      <input type="checkbox" checked={notePublic} onChange={(e) => setNotePublic(e.target.checked)} />
                      ظاهر للزبون
                    </label>
                    <Button size="sm" disabled={busy || !note.trim()} onClick={() => void addNote(c.id)}>
                      {notePublic ? "إرسال الرد" : "حفظ الملاحظة"}
                    </Button>
                    {c.assigned_to !== myId && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void assignToMe(c.id)}>
                        عيّنها إلي
                      </Button>
                    )}
                    {(NEXT_STATUSES[c.status] ?? []).length > 0 && (
                      <Select
                        value=""
                        onChange={(e) => e.target.value && void setStatus(c.id, e.target.value)}
                        className="h-8 w-44"
                      >
                        <option value="">غيّر الحالة…</option>
                        {(NEXT_STATUSES[c.status] ?? []).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_AR[s]}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
