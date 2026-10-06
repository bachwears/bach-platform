"use client";

import { Button } from "@bach/ui/components/button";
import { Icon } from "@bach/ui/components/icon";

export function PrintButton({ label = "طباعة" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Icon name="print" size={16} />
      {label}
    </Button>
  );
}
