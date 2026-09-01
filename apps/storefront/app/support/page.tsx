"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Textarea } from "@bach/ui/components/textarea";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../../lib/locale-client";

export default function SupportPage() {
  const locale = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<number | null>(null);

  const phoneOk = phone.replace(/[^0-9+]/g, "").length >= 7;
  const canSubmit = !busy && name.trim() && phoneOk && subject.trim() && body.trim();

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await supabaseBrowser().rpc("submit_complaint", {
      p_name: name.trim(),
      p_phone: phone,
      p_subject: subject.trim(),
      p_body: body.trim(),
      p_email: email.trim() || null,
      p_order_number: orderNo.trim() ? parseInt(orderNo.replace(/[^0-9]/g, ""), 10) : null,
    });
    setBusy(false);
    if (err) {
      setError(err.message.includes("too many") ? t(locale, "sf.support.tooMany") : t(locale, "sf.support.failed"));
      return;
    }
    setTicket(data![0].ticket_number);
  }

  if (ticket) {
    return (
      <div className="min-h-dvh bg-background">
        <main className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {t(locale, "sf.support.heard")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {t(locale, "sf.support.ticket")} <span className="font-mono" dir="ltr">#{ticket}</span>
            </h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">{t(locale, "sf.support.ticketBody")}</p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link href={lhref(locale, `/support/track?n=${ticket}`)}>
                <Button variant="outline">{t(locale, "sf.support.trackCta")}</Button>
              </Link>
              <Link href={lhref(locale, "/")} className="text-sm underline underline-offset-4">
                {t(locale, "sf.support.backShop")}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "sf.support.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(locale, "sf.support.sub1")}{" "}
          <Link href={lhref(locale, "/support/track")} className="underline underline-offset-4">
            {t(locale, "sf.support.sub2")}
          </Link>
          .
        </p>

        <div className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t(locale, "sf.support.name")}>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label={t(locale, "sf.support.phone")}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="+961 71 000 000" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t(locale, "sf.support.email")}>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" dir="ltr" />
            </Field>
            <Field label={t(locale, "sf.support.orderNo")}>
              <Input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} inputMode="numeric" dir="ltr" placeholder="#" />
            </Field>
          </div>
          <Field label={t(locale, "sf.support.subject")}>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label={t(locale, "sf.support.what")}>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="h-12 w-full text-base" disabled={!canSubmit} onClick={() => void submit()}>
            {busy ? t(locale, "sf.support.submitting") : t(locale, "sf.support.submit")}
          </Button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
