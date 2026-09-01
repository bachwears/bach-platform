"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Textarea } from "@bach/ui/components/textarea";


export default function SupportPage() {
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
      setError(
        err.message.includes("too many")
          ? "You already have several open tickets — we're on them. Call us if it's urgent."
          : "Could not submit — please check your details and try again.",
      );
      return;
    }
    setTicket(data![0].ticket_number);
  }

  if (ticket) {
    return (
      <div className="min-h-dvh bg-background">
        <main className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">We hear you</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Ticket <span className="font-mono">#{ticket}</span>
            </h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Your complaint is with our team. Keep this number — you can check its status anytime with
              your phone number. We usually respond within one business day.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link href={`/support/track?n=${ticket}`}>
                <Button variant="outline">Track this ticket</Button>
              </Link>
              <Link href="/" className="text-sm underline underline-offset-4">
                Back to the shop
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
        <h1 className="text-2xl font-semibold tracking-tight">Something wrong? Tell us.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          File a complaint and get a ticket number to track it —{" "}
          <Link href="/support/track" className="underline underline-offset-4">
            or track an existing one
          </Link>
          .
        </p>

        <div className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="+961 71 000 000" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email (optional)">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" dir="ltr" />
            </Field>
            <Field label="Order number (optional)">
              <Input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} inputMode="numeric" dir="ltr" placeholder="#" />
            </Field>
          </div>
          <Field label="Subject">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="What happened?">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="h-12 w-full text-base" disabled={!canSubmit} onClick={() => void submit()}>
            {busy ? "Submitting…" : "Submit complaint"}
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
