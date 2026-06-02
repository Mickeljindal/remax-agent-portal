import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CardLabel {
  title: string;
  description: string;
}

/**
 * Loads admin-editable overrides for the admin panel cards.
 * Returns a resolver that merges DB overrides over the default label.
 */
export function useAdminCardLabels() {
  const [overrides, setOverrides] = useState<Record<string, CardLabel>>({});
  const [loading, setLoading] = useState(true);

  const fetchOverrides = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("admin_card_overrides").select("*");
    const map: Record<string, CardLabel> = {};
    (data || []).forEach((r: any) => {
      map[r.card_key] = { title: r.title || "", description: r.description || "" };
    });
    setOverrides(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  /** Returns the effective label for a card (override if present, else default). */
  const label = useCallback(
    (key: string, defaultTitle: string, defaultDescription: string): CardLabel => {
      const o = overrides[key];
      return {
        title: o?.title?.trim() || defaultTitle,
        description: o?.description?.trim() || defaultDescription,
      };
    },
    [overrides]
  );

  const saveLabel = async (key: string, title: string, description: string) => {
    const { error } = await supabase.from("admin_card_overrides").upsert(
      { card_key: key, title, description, updated_at: new Date().toISOString() },
      { onConflict: "card_key" }
    );
    if (error) {
      console.error("Failed to save card label:", error);
      return false;
    }
    // Update local state immediately AND refetch to stay in sync
    setOverrides((prev) => ({ ...prev, [key]: { title, description } }));
    fetchOverrides();
    return true;
  };

  return { overrides, loading, label, saveLabel, refetch: fetchOverrides };
}
