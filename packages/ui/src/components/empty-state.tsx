import type { ReactNode } from "react";

import { Icon, type IconName } from "./icon";

/**
 * An empty list, said plainly: the screen's icon, what's missing, and the next
 * step (a link or button). Hairline box, no illustration.
 */
export function EmptyState({ icon, title, children, action }: { icon: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 border px-6 py-10 text-center">
      <Icon name={icon} size={28} className="text-muted-foreground" />
      <p className="text-sm">{title}</p>
      {children ? <div className="max-w-md text-sm text-muted-foreground">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
