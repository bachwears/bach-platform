"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";
import { Icon } from "@bach/ui/components/icon";

interface Entry {
  id: number;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  bag_usd_cents: number | null;
  notified_at: string | null;
}

// calling codes worth naming (longest prefix wins); anything else shows as +code
const COUNTRIES: Array<[string, string]> = [
  ["966", "السعودية"], ["971", "الإمارات"], ["965", "الكويت"], ["974", "قطر"], ["973", "البحرين"], ["968", "عُمان"],
  ["962", "الأردن"], ["963", "سوريا"], ["964", "العراق"], ["20", "مصر"], ["212", "المغرب"], ["213", "الجزائر"], ["216", "تونس"],
  ["90", "تركيا"], ["49", "ألمانيا"], ["33", "فرنسا"], ["44", "بريطانيا"], ["46", "السويد"], ["31", "هولندا"], ["32", "بلجيكا"],
  ["41", "سويسرا"], ["39", "إيطاليا"], ["34", "إسبانيا"], ["1", "أميركا / كندا"], ["61", "أستراليا"], ["221", "السنغال"], ["225", "ساحل العاج"],
];
COUNTRIES.sort((a, b) => b[0].length - a[0].length);

function countryOf(phone: string | null): string {
  const s = (phone ?? "").trim();
  const digits = s.replace(/\D/g, "");
  const intl = s.startsWith("+") ? digits : digits.startsWith("00") ? digits.slice(2) : "";
  if (!intl) return "—";
  const hit = COUNTRIES.find(([code]) => intl.startsWith(code));
  return hit ? hit[1] : `+${intl.slice(0, 3)}`;
}

const usd = (cents: number) => `$${(cents / 100).toFixed(0)}`;
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** MGMT → محتوى الموقع: shoppers abroad waiting for international delivery. */
export function IntlWaitlistList() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    void supabaseBrowser()
      .from("international_waitlist")
      .select("id, created_at, name, email, phone, bag_usd_cents, notified_at")
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setRows((data ?? []) as Entry[]);
      });
  }, []);

  const counts = new Map<string, number>();
  for (const r of rows ?? []) counts.set(countryOf(r.phone), (counts.get(countryOf(r.phone)) ?? 0) + 1);
  const byCountry = [...counts].sort((a, b) => b[1] - a[1]);

  function download() {
    const head = ["date", "name", "email", "whatsapp", "country", "bag_usd"];
    const lines = (rows ?? []).map((r) =>
      [r.created_at.slice(0, 10), r.name ?? "", r.email ?? "", r.phone ?? "", countryOf(r.phone), r.bag_usd_cents ? String(r.bag_usd_cents / 100) : ""]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([`﻿${[head.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bach-international-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  return (
    <div className="space-y-3 border p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <Icon name="customers" size={18} className="text-muted-foreground" />
        لائحة انتظار التوصيل لبرّا لبنان {rows ? <span className="font-mono text-sm text-muted-foreground">({rows.length})</span> : null}
        <HintDot
          hint={{
            title: "لائحة انتظار التوصيل الدولي",
            what: "طول ما «شحن داخل لبنان فقط» شغّالة، اللي رقمو من برّا لبنان ما بيقدر يطلب توصيل — بيطلعلو «التوصيل لبرّا لبنان جايي قريباً» وبيترك إيميل أو واتساب. هودي هني. منستعمل رقمهن بس لنخبّرهن يوم يفتح الشحن الدولي.",
            source: "جدول international_waitlist، من صفحة الدفع بالموقع.",
            edit: "ما بينعدّل من هون. نزّل الـCSV يوم الإطلاق وابعتلهن.",
          }}
        />
      </h2>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {!rows ? (
        <p className="text-sm text-muted-foreground">عم نحمّل…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">لسّا ما حدا ترك رقمو.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{byCountry.map(([c, n]) => `${c} ${n}`).join(" · ")}</p>
          <div className="max-h-80 overflow-auto border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-2 text-start font-normal">التاريخ</th>
                  <th className="p-2 text-start font-normal">الاسم</th>
                  <th className="p-2 text-start font-normal">الإيميل</th>
                  <th className="p-2 text-start font-normal">واتساب</th>
                  <th className="p-2 text-start font-normal">البلد</th>
                  <th className="p-2 text-start font-normal">السلّة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-2 font-mono text-xs" dir="ltr">{r.created_at.slice(0, 10)}</td>
                    <td className="p-2">{r.name ?? "—"}</td>
                    <td className="p-2 text-xs" dir="ltr">{r.email ?? "—"}</td>
                    <td className="p-2 font-mono text-xs" dir="ltr">{r.phone ?? "—"}</td>
                    <td className="p-2">{countryOf(r.phone)}</td>
                    <td className="p-2 font-mono">{r.bag_usd_cents ? usd(r.bag_usd_cents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" onClick={download}>
            <Icon name="download" size={16} />
            نزّل CSV
          </Button>
        </>
      )}
    </div>
  );
}
