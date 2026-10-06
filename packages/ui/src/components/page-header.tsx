import type { ReactNode } from "react";

import { HintDot, type HintContent } from "./hint-dot";
import { Icon, type IconName } from "./icon";

/**
 * The top of every staff screen, the same everywhere: what the screen is
 * (title + "?"), one plain line on what it's for, and its main actions on the
 * same row (they wrap under the title on phones).
 */
export function PageHeader({
  title,
  icon,
  description,
  hint,
  actions,
  back,
}: {
  title: ReactNode;
  /** the screen's icon from the BACH set (same as in the menu) */
  icon?: IconName;
  description?: ReactNode;
  hint?: HintContent;
  actions?: ReactNode;
  /** a link back up, e.g. { href: "/orders", label: "الطلبات" } */
  back?: { href: string; label: string };
}) {
  return (
    <div className="space-y-3 border-b pb-5 print:hidden">
      {back ? (
        <a href={back.href} className="inline-block text-xs uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground">
          → {back.label}
        </a>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-normal tracking-tight">
            {icon ? <Icon name={icon} size={24} className="shrink-0" /> : null}
            {title}
            {hint ? <HintDot hint={hint} /> : null}
          </h1>
          {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
