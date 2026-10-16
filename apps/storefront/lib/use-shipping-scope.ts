"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";

import { shippingScopeOf, type ShippingScope } from "./shipping-scope";

/** The Lebanon-only setting for client pages (bag, checkout); off until it loads. */
export function useShippingScope(): ShippingScope {
  const [scope, setScope] = useState<ShippingScope>(() => shippingScopeOf(null));
  useEffect(() => {
    void supabaseBrowser()
      .from("site_content")
      .select("value")
      .eq("key", "shipping")
      .maybeSingle()
      .then(({ data }) => setScope(shippingScopeOf(data?.value)));
  }, []);
  return scope;
}
