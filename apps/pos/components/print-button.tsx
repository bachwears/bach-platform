"use client";

import { Printer } from "lucide-react";
import { Button } from "@bach/ui/components/button";

/** A page-header action that prints the screen (the page's print: layout decides what lands on paper). */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="outline" className="h-10" onClick={() => window.print()}>
      <Printer className="me-1.5 h-4 w-4" strokeWidth={1.5} aria-hidden />
      {label}
    </Button>
  );
}
