import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * The reorderable top-level agent-dashboard sections. "precon" is a single
 * block that internally renders listings, assets, buyer-kit, and the library.
 */
export const DEFAULT_SECTION_ORDER = [
  "dashboard",
  "courses",
  "precon",
  "vendors",
  "vastu",
  "support",
  "offices",
] as const;

export type SectionKey = (typeof DEFAULT_SECTION_ORDER)[number];

export const SECTION_META: Record<SectionKey, { label: string }> = {
  dashboard: { label: "Dashboard (calendar & training)" },
  courses: { label: "Training & courses" },
  precon: { label: "Pre-construction (listings, assets, buyer kit, documents)" },
  vendors: { label: "Approved vendors" },
  vastu: { label: "Vastu Chakra (floor-plan tool)" },
  support: { label: "Support" },
  offices: { label: "Office locations & booking" },
};

const KEY = "section_order";

/** Keeps a stored order valid: known keys only, all defaults present, no dupes. */
function normalize(order: unknown): SectionKey[] {
  const valid = (Array.isArray(order) ? order : []).filter(
    (k): k is SectionKey => (DEFAULT_SECTION_ORDER as readonly string[]).includes(k as string)
  );
  const seen = new Set<SectionKey>();
  const deduped = valid.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
  // Append any missing defaults (e.g. after adding a new section).
  for (const k of DEFAULT_SECTION_ORDER) if (!seen.has(k)) deduped.push(k);
  return deduped;
}

/**
 * Reads (and lets admins update) the agent-portal section order.
 */
export function useSectionOrder() {
  const [order, setOrder] = useState<SectionKey[]>([...DEFAULT_SECTION_ORDER]);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("portal_settings").select("value").eq("key", KEY).maybeSingle();
    const stored = (data?.value as { order?: unknown } | null)?.order;
    setOrder(normalize(stored));
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const save = async (next: SectionKey[]) => {
    const normalized = normalize(next);
    const { error } = await supabase.from("portal_settings").upsert(
      { key: KEY, value: { order: normalized }, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (!error) setOrder(normalized);
    return !error;
  };

  return { order, loading, save, refetch: fetchOrder };
}
