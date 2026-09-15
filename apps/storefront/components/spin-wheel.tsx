"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

const SEGMENTS = [
  { key: "percent-5", label: "5% OFF", color: "#1a1a1a" },
  { key: "none", label: "Try again", color: "#3d3d3d" },
  { key: "percent-10", label: "10% OFF", color: "#1a1a1a" },
  { key: "none", label: "Try again", color: "#3d3d3d" },
  { key: "percent-15", label: "15% OFF", color: "#7a1f2b" },
  { key: "none", label: "Try again", color: "#3d3d3d" },
  { key: "percent-5", label: "5% OFF", color: "#1a1a1a" },
  { key: "percent-10", label: "10% OFF", color: "#1a1a1a" },
];
const SEG = 360 / SEGMENTS.length;
const STORAGE_KEY = "bach-wheel-done";

/** Spin-the-wheel promo game. The PRIZE IS DECIDED SERVER-SIDE (one spin
 *  per email, real single-use promocode) — the wheel animation just lands
 *  on a segment matching the server's verdict. */
export function SpinWheel({ title, sub }: { title: string; sub: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ prize: string; code: string | null; already: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setOpen(true), 9000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, result ? "played" : "dismissed");
    } catch {
      /* private mode */
    }
  }

  async function spin() {
    if (spinning || !email.trim()) return;
    setErr("");
    setSpinning(true);
    const { data, error } = await supabaseBrowser().rpc("spin_wheel", { p_email: email.trim() });
    if (error || !data) {
      setSpinning(false);
      setErr(error?.message.includes("invalid email") ? "Enter a valid email address." : "Something went wrong — try again.");
      return;
    }
    const verdict = data as { already_played: boolean; prize: string; code: string | null };
    const matching = SEGMENTS.map((s, i) => ({ s, i })).filter((x) => x.s.key === verdict.prize);
    const target = matching[Math.floor(Math.random() * matching.length)]?.i ?? 0;
    // land the chosen segment under the top pointer
    const finalAngle = 5 * 360 + (360 - (target * SEG + SEG / 2));
    if (reduced.current) {
      setRotation(finalAngle % 360);
      finish(verdict);
    } else {
      setRotation(finalAngle);
      setTimeout(() => finish(verdict), 4600);
    }
  }

  function finish(v: { already_played: boolean; prize: string; code: string | null }) {
    setSpinning(false);
    setResult({ prize: v.prize, code: v.code, already: v.already_played });
    try {
      localStorage.setItem(STORAGE_KEY, "played");
    } catch {
      /* private mode */
    }
  }

  if (!open) return null;

  const gradient = `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(", ")})`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-label={title}>
      <div className="glass-panel anim-materialize relative w-full max-w-sm rounded-2xl p-6 text-center shadow-xl">
        <button
          type="button"
          aria-label="Close"
          className="absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground"
          onClick={dismiss}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>

        <div className="relative mx-auto my-6 h-56 w-56">
          <div
            aria-hidden
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-foreground"
          />
          <div
            className="h-full w-full rounded-full border-4 border-foreground/80 shadow-inner"
            style={{
              background: gradient,
              transform: `rotate(${rotation}deg)`,
              transition: spinning && !reduced.current ? "transform 4.5s cubic-bezier(0.12, 0.8, 0.16, 1)" : undefined,
            }}
          >
            {SEGMENTS.map((s, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 origin-top-left text-[10px] font-semibold tracking-wider text-white"
                style={{ transform: `rotate(${i * SEG + SEG / 2 - 90}deg) translate(38px, -6px)` }}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {result ? (
          <div className="space-y-3">
            {result.code ? (
              <>
                <p className="font-medium">
                  {result.already ? "You already played — here's your code again:" : `You won ${result.prize.replace("percent-", "")}% off!`}
                </p>
                <button
                  type="button"
                  className="mx-auto flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-sm hover:bg-black/5"
                  dir="ltr"
                  onClick={() => {
                    void navigator.clipboard?.writeText(result.code!);
                    setCopied(true);
                  }}
                >
                  {result.code}
                  <span className="text-xs text-muted-foreground">{copied ? "copied" : "tap to copy"}</span>
                </button>
                <p className="text-xs text-muted-foreground">Valid 7 days · one use · apply it at checkout.</p>
              </>
            ) : (
              <p className="font-medium">
                {result.already ? "You already played this round — stay tuned for the next one." : "No luck this time — the collection is still worth a look."}
              </p>
            )}
            <Button className="w-full" onClick={dismiss}>
              Continue shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              type="email"
              dir="ltr"
              value={email}
              placeholder="your@email.com"
              disabled={spinning}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void spin()}
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button className="w-full" disabled={spinning || !email.includes("@")} onClick={() => void spin()}>
              {spinning ? "Spinning…" : "Spin the wheel"}
            </Button>
            <p className="text-xs text-muted-foreground">One spin per email. By playing you join the BACH newsletter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
