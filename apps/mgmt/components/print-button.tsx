"use client";

import { Button } from "@bach/ui/components/button";

export function PrintButton({ label = "طباعة" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
