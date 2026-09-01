"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

import { SiteHeader } from "../../../components/site-header";

const STATUS_EN: Record<string, string> = {
  open: "Received",
  in_progress: "Being handled",
  waiting_customer: "Waiting for you",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};

interface Tracked {
  status: string;
  subject: string;
  created_at: string;
  events: Array<{ kind: string; body: string; at: string }>;
}

function TrackForm() {
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get("n") ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Tracked | null>(null);

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
      setError("No ticket found for that number and phone.");
      return;
    }
    setResult(data[0] as unknown as Tracked);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Track your ticket</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your ticket number and the phone you used when filing it.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Ticket #"
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
          {busy ? "…" : "Track"}
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-8 rounded-md border p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{result.subject}</p>
            <Badge variant={["resolved", "closed"].includes(result.status) ? "default" : "secondary"}>
              {STATUS_EN[result.status] ?? result.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Filed {new Date(result.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {result.events.length > 0 && (
            <ul className="mt-4 space-y-3 border-t pt-4 text-sm">
              {result.events.map((e, i) => (
                <li key={i}>
                  <p className="whitespace-pre-line">{e.kind === "status" ? `Status: ${e.body}` : e.body}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(e.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
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
      <SiteHeader />
      <Suspense>
        <TrackForm />
      </Suspense>
    </div>
  );
}
