"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Latest LBP/USD rate. The page loads the rate once at render, but a change in
 * MGMT applies server-side immediately — re-check right before money moves.
 * Returns null when the rate can't be read (offline / error): keep the current one.
 */
export async function fetchLatestRate(supabase: SupabaseClient): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("lbp_per_usd")
      .order("effective_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const n = Number(data.lbp_per_usd);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export const RATE_CHANGED_MSG = "سعر الصرف تغيّر — حدّثنا المبالغ عالسعر الجديد. راجع الدفع والباقي وكبوس مرة تانية.";
