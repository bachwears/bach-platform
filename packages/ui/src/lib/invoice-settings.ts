import type { supabaseBrowser } from "@bach/supabase/browser";

type SupabaseClient = ReturnType<typeof supabaseBrowser>;

/**
 * What the till receipt prints besides the sale itself — set in MGMT →
 * إعدادات الفاتورة (site_content key `invoice`). Every field has a default, so
 * a receipt prints the same as before until something is changed.
 */
export interface InvoiceSettings {
  /** print the BACH logo at the top (else the business name as text) */
  show_logo: boolean;
  business_name: string;
  address: string;
  phone: string;
  website: string;
  instagram: string;
  /** commercial registration / tax number, printed when set */
  tax_id: string;
  show_branch: boolean;
  /** the total in LBP next to the USD total */
  show_lbp_total: boolean;
  show_rate: boolean;
  /** "Returns within N days · exchange within M days" from the returns policy */
  show_policy: boolean;
  footer_en: string;
  footer_ar: string;
  /** thermal roll width */
  paper: "80" | "58";
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  show_logo: true,
  business_name: "BACH WEARS",
  address: "",
  phone: "",
  website: "bachwears.com",
  instagram: "",
  tax_id: "",
  show_branch: true,
  show_lbp_total: true,
  show_rate: true,
  show_policy: false,
  footer_en: "Thank you for shopping with us.",
  footer_ar: "",
  paper: "80",
};

/** The returns windows the receipt can quote (site_content `returns`). */
export interface ReturnWindows {
  return_days: number;
  exchange_days: number;
}

export interface InvoiceConfig {
  settings: InvoiceSettings;
  returns: ReturnWindows | null;
}

const CACHE_KEY = "bach-invoice-settings";

/** Last settings this device saw — so an offline till still prints them. */
export function cachedInvoiceConfig(): InvoiceConfig {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const c = JSON.parse(raw) as InvoiceConfig;
      return { settings: { ...DEFAULT_INVOICE_SETTINGS, ...c.settings }, returns: c.returns ?? null };
    }
  } catch {
    /* storage blocked */
  }
  return { settings: DEFAULT_INVOICE_SETTINGS, returns: null };
}

export async function loadInvoiceConfig(supabase: SupabaseClient): Promise<InvoiceConfig> {
  const { data, error } = await supabase.from("site_content").select("key, value").in("key", ["invoice", "returns"]);
  if (error) return cachedInvoiceConfig();
  const row = (k: string) => (data ?? []).find((r) => r.key === k)?.value as Record<string, unknown> | undefined;
  const r = row("returns");
  const config: InvoiceConfig = {
    settings: { ...DEFAULT_INVOICE_SETTINGS, ...((row("invoice") ?? {}) as Partial<InvoiceSettings>) },
    returns:
      r && Number(r.return_days) > 0
        ? { return_days: Number(r.return_days), exchange_days: Number(r.exchange_days ?? r.return_days) }
        : null,
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    /* storage blocked */
  }
  return config;
}
