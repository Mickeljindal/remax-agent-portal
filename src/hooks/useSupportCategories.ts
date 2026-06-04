import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SupportCategory {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

// Fallback used if the table is empty or unreachable, so the ticket form never breaks.
const FALLBACK: SupportCategory[] = [
  { id: "general", key: "general", label: "General", description: null, is_active: true, sort_order: 0 },
  { id: "marketing", key: "marketing", label: "Marketing Support", description: null, is_active: true, sort_order: 1 },
  { id: "tech", key: "tech", label: "Tech Support", description: null, is_active: true, sort_order: 2 },
];

/**
 * Admin-managed support categories ("tabs"): Marketing, Vendors, Tech, etc.
 * Agents see only active ones; admins manage the full list.
 */
export function useSupportCategories(opts: { includeInactive?: boolean } = {}) {
  const { includeInactive = false } = opts;
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("support_categories").select("*").order("sort_order");
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      setCategories(includeInactive ? [] : FALLBACK);
    } else {
      setCategories(data as SupportCategory[]);
    }
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}
