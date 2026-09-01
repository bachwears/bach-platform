"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";

interface Subscriber {
  email: string;
  locale: string;
  consented_at: string;
  unsubscribed_at: string | null;
}

export function NewsletterCard() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void supabaseBrowser()
      .from("newsletter_subscribers")
      .select("email, locale, consented_at, unsubscribed_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSubs((data ?? []) as Subscriber[]);
        setLoaded(true);
      });
  }, []);

  const active = subs.filter((s) => !s.unsubscribed_at);

  function exportCsv() {
    const rows = [
      ["email", "locale", "consented_at", "status"],
      ...subs.map((s) => [s.email, s.locale, s.consented_at, s.unsubscribed_at ? "unsubscribed" : "active"]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">النشرة البريدية</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loaded ? (
              <>
                {active.length} مشترك فعّال · {subs.length - active.length} ملغى
              </>
            ) : (
              "عم يحمّل…"
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={!subs.length} onClick={exportCsv}>
          تصدير CSV
        </Button>
      </div>
      {active.length > 0 && (
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm text-muted-foreground">
          {active.slice(0, 50).map((s) => (
            <li key={s.email} className="flex justify-between gap-3">
              <span dir="ltr">{s.email}</span>
              <span>{s.locale === "ar" ? "عربي" : "EN"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
