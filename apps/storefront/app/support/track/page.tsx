"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { t, type Locale } from "@bach/i18n";

import { useLocale } from "../../../lib/locale-client";

interface Tracked {
  status: string;
  subject: string;
  created_at: string;
  events: Array<{ kind: string; body: string; at: string }>;
}

function statusLabel(locale: Locale, status: string) {
  const label = t(locale, `sf.status.${status}`);
  return label === `sf.status.${status}` ? status : label;
}

function TrackForm() {
  const locale = useLocale();
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get("n") ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Tracked | null>(null);

  const dateLocale = locale === "ar" ? "ar-LB" : "en-GB";

  async function track() {
    const n = parseInt(number.replace(/[^0-9]/g, ""), 10);
    if (!n || !phone.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    const { data, error: err } = await supabaseBrowser().rpc("track_complaint", {
      p_number: n,
      p_phone: phone,
    });
    setBusy(false);
    if (err || !data?.length) {
      setError(t(locale, "sf.track.notFound"));
      return;
    }
    setResult(data[0] as unknown as Tracked);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "sf.track.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t(locale, "sf.track.sub")}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={t(locale, "sf.track.ticketPh")}
          inputMode="numeric"
          dir="ltr"
          className="w-32 font-mono"
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+961 71 000 000"
          inputMode="tel"
          dir="ltr"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && void track()}
        />
        <Button disabled={busy} onClick={() => void track()}>
          {busy ? "…" : t(locale, "sf.track.go")}
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-8 rounded-md border p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{result.subject}</p>
            <Badge variant={["resolved", "closed"].includes(result.status) ? "default" : "secondary"}>
              {statusLabel(locale, result.status)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(locale, "sf.track.filed", {
              d: new Date(result.created_at).toLocaleDateString(dateLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            })}
          </p>
          {result.events.length > 0 && (
            <ul className="mt-4 space-y-3 border-t pt-4 text-sm">
              {result.events.map((e, i) => (
                <li key={i}>
                  <p className="whitespace-pre-line">
                    {e.kind === "status"
                      ? t(locale, "sf.track.statusPrefix", { s: statusLabel(locale, e.body) })
                      : e.body}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(e.at).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}

export default function TrackPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Suspense>
        <TrackForm />
      </Suspense>
    </div>
  );
}
