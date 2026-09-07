"use client";

import { MessageCircle } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

const WA = "https://wa.me/96171566296";

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

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content: "Hi! I'm the BACH assistant — ask me about ordering, delivery, returns, or your birthday gift. 🖤",
};

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    const ctrl = new AbortController();
    const late = setTimeout(() => ctrl.abort(), 12000);
    try {
      // Signed-in customers get their own live order data — the function
      // reads identity from the JWT, so send the session token when we have one.
      const { data: sess } = await supabaseBrowser().auth.getSession();
      const token = sess.session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/assistant`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history: next.slice(-10) }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error("assistant unavailable");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `That's taking too long — chat with a human right now on WhatsApp: ${WA}` },
      ]);
    }
    clearTimeout(late);
    setBusy(false);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with us"
          className="fixed bottom-5 right-5 z-40 grid h-13 w-13 place-items-center rounded-full bg-foreground p-4 text-background shadow-lg transition-transform hover:scale-105"
        ><MessageCircle className="h-5 w-5" aria-hidden /></button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[28rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold tracking-widest">BACH</p>
              <p className="text-xs text-muted-foreground">Assistant</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 leading-relaxed ${
                    m.role === "user" ? "bg-foreground text-background" : "bg-muted"
                  }`}
                >
                  {m.role === "assistant" ? renderContent(m.content) : m.content}
                </p>
              </div>
            ))}
            {busy && <p className="text-xs text-muted-foreground">typing…</p>}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              placeholder="Ask anything…"
              disabled={busy}
            />
            <Button size="sm" className="h-9" disabled={busy || !input.trim()} onClick={() => void send()}>
              Send
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
