"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Bag, checkout and confirmation: promotional popups wait until the purchase is done. */
export function useInPurchase() {
  const path = usePathname() ?? "";
  return /^(\/ar)?\/(cart|checkout|confirmed)(\/|$)/.test(path);
}

/**
 * Popup frame: a real modal dialog — Escape and a click outside close it, focus
 * moves in on open, Tab stays inside, and focus returns where it was on close.
 */
export function ModalShell({
  label,
  onClose,
  children,
  className = "w-full max-w-sm border bg-background p-8 text-center",
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...(box.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), textarea, select") ?? [])];
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close.current();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => close.current()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
