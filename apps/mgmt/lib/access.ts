/**
 * Which staff roles may open each MGMT screen. Mirrors the database rules (RLS
 * and RPC role checks), so a role only reaches screens where its changes save.
 * The middleware redirects other roles to the dashboard, and the nav hides the
 * links. Super admin opens everything. Paths not listed are open to all staff.
 */
export type StaffRole =
  | "super_admin"
  | "store_manager"
  | "inventory_manager"
  | "cashier"
  | "support_agent"
  | "marketing_manager";

const CATALOG: StaffRole[] = ["store_manager", "marketing_manager"];
const STOCK: StaffRole[] = ["store_manager", "inventory_manager"];
const SERVICE: StaffRole[] = ["store_manager", "support_agent", "cashier"];

// Longest matching prefix wins (/categories/images before /categories).
const ROUTES: Array<[string, StaffRole[]]> = [
  ["/orders", SERVICE],
  ["/customers", SERVICE],
  ["/returns", SERVICE],
  ["/complaints", ["store_manager", "support_agent"]],
  ["/products", CATALOG],
  ["/categories", CATALOG],
  ["/collections", CATALOG],
  ["/media-import", CATALOG],
  ["/media-match", CATALOG],
  ["/product-health", CATALOG],
  ["/sizes", STOCK],
  ["/labels", STOCK],
  ["/inventory", STOCK],
  ["/purchasing", STOCK],
  ["/reports", ["store_manager"]],
  ["/exchange-rate", ["store_manager"]],
  ["/payments", []],
  ["/marketing", CATALOG],
  ["/site-content", CATALOG],
  ["/help-articles", ["marketing_manager"]],
];

export function canOpen(path: string, role: string | null | undefined): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  const hit = ROUTES.filter(([p]) => path === p || path.startsWith(`${p}/`)).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1].includes(role as StaffRole) : true;
}

/**
 * An update the database refuses for a role changes 0 rows without an error.
 * Writes that report success select the changed ids and show this when none came back.
 */
export const NOT_SAVED = "ما انحفظ شي — دورك ما بيسمح بهالتعديل، أو العنصر انمحى. احكي السوبر أدمن إذا لازم.";
