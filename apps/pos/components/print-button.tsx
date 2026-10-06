"use client";

import { Button } from "@bach/ui/components/button";
import { Icon } from "@bach/ui/components/icon";

/** A page-header action that prints the screen (the page's print: layout decides what lands on paper). */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="outline" className="h-10" onClick={() => window.print()}>
      <Icon name="print" size={16} />
      {label}
    </Button>
  );
}
