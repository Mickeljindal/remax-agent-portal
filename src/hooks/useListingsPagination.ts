import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ListingsPaginationSetting {
  page_size: number;
  enabled: boolean;
}

const DEFAULTS: ListingsPaginationSetting = { page_size: 6, enabled: true };
const KEY = "listings_pagination";

/**
 * Reads (and lets admins update) the listings pagination setting.
 */
export function useListingsPagination() {
  const [setting, setSetting] = useState<ListingsPaginationSetting>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSetting = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("portal_settings").select("value").eq("key", KEY).single();
    if (data?.value) {
      const v = data.value as Partial<ListingsPaginationSetting>;
      setSetting({
        page_size: typeof v.page_size === "number" && v.page_size > 0 ? v.page_size : DEFAULTS.page_size,
        enabled: v.enabled !== false,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSetting(); }, [fetchSetting]);

  const save = async (next: ListingsPaginationSetting) => {
    const { error } = await supabase.from("portal_settings").upsert(
      { key: KEY, value: next, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (!error) setSetting(next);
    return !error;
  };

  return { setting, loading, save, refetch: fetchSetting };
}
