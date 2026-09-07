"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "./button";
import { Input } from "./input";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const WA = "https://wa.me/96171566296";
const GREETING: Msg = {
  role: "assistant",
  content: "أهلا! أنا مساعد BACH — اسألني عن أي شي بالنظام: وين بتتعدل الأشيا، وضع طلب، مخزون قطعة، أو سعر الصرف.",
};
const LATE_MSG = "الجواب عم يطوّل — إذا الموضوع مستعجل، افتح واتساب المحل وحدا بيرد عليك فوراً.";

/** Linkify the WhatsApp URL inside assistant replies. */
function renderContent(text: string) {
  const parts = text.split(WA);
  if (parts.length === 1) return text;
  return parts.flatMap((p, i) =>
    i === 0
      ? [p]
      : [
          <a key={i} href={WA} target="_blank" rel="noreferrer" className="underline underline-offset-2" dir="ltr">
            WhatsApp
          </a>,
          p,
        ],
  );
}

/**
 * Staff chat for POS/MGMT (§11): role-aware — the edge function reads the
 * caller's role from their session JWT. Renders nothing when signed out.
 * Slow or failed answers hand off to the shop WhatsApp directly.
 */
export function StaffAssistant() {
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!token) return null;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    const ctrl = new AbortController();
    const late = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history: next.slice(-10) }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error("assistant unavailable");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: `${LATE_MSG} ${WA}` }]);
    }
    clearTimeout(late);
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="مساعد BACH"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 end-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95 print:hidden"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="glass-panel anim-materialize fixed bottom-20 end-4 z-40 flex h-[26rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5 print:hidden">
          <div className="border-b border-black/5 px-4 py-3">
            <p className="text-sm font-semibold">مساعد BACH</p>
            <p className="text-xs text-muted-foreground">بيجاوب من داتا النظام الحية ومقالات المساعدة</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
                <p
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-es-sm bg-foreground px-3.5 py-2 text-sm text-background"
                      : "max-w-[85%] rounded-2xl rounded-ee-sm bg-black/5 px-3.5 py-2 text-sm dark:bg-white/10"
                  }
                >
                  {m.role === "assistant" ? renderContent(m.content) : m.content}
                </p>
              </div>
            ))}
            {busy && <p className="text-xs text-muted-foreground">عم يفكّر…</p>}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t border-black/5 p-3">
            <Input
              value={input}
              placeholder="اسأل عن أي شي بالنظام…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
            />
            <Button size="sm" className="h-10" disabled={busy} onClick={() => void send()}>
              ابعت
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
