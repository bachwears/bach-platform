"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Underlined search input. Results update as you type (the URL is replaced
 * after a short pause, so every search stays a shareable link).
 */
export function SearchField({ initial, placeholder }: { initial: string; placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function go(term: string) {
    const q = term.trim();
    startTransition(() => router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false }));
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        go(value);
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <input
        type="search"
        name="q"
        value={value}
        autoFocus={!initial}
        autoComplete="off"
        enterKeyHint="search"
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => go(next), 300);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-busy={pending}
        className="type-label h-12 w-full border-0 border-b border-foreground bg-transparent px-0 outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}
