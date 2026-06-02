import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SectionLabel { title: string; subtitle: string; }

interface SectionLabelsContextValue {
  label: (key: string, defaultTitle: string, defaultSubtitle?: string) => SectionLabel;
  saveLabel: (key: string, title: string, subtitle: string) => Promise<boolean>;
  loading: boolean;
}

const SectionLabelsContext = createContext<SectionLabelsContextValue | null>(null);

export function SectionLabelsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, SectionLabel>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("section_labels").select("*");
    const map: Record<string, SectionLabel> = {};
    (data || []).forEach((r: any) => {
      map[r.section_key] = { title: r.title || "", subtitle: r.subtitle || "" };
    });
    setOverrides(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const label = useCallback(
    (key: string, defaultTitle: string, defaultSubtitle = ""): SectionLabel => {
      const o = overrides[key];
      return {
        title: o?.title?.trim() || defaultTitle,
        subtitle: o?.subtitle?.trim() || defaultSubtitle,
      };
    },
    [overrides]
  );

  const saveLabel = async (key: string, title: string, subtitle: string) => {
    const { error } = await supabase.from("section_labels").upsert(
      { section_key: key, title, subtitle, updated_at: new Date().toISOString() },
      { onConflict: "section_key" }
    );
    if (error) { console.error("save section label failed", error); return false; }
    setOverrides((prev) => ({ ...prev, [key]: { title, subtitle } }));
    fetchAll();
    return true;
  };

  return (
    <SectionLabelsContext.Provider value={{ label, saveLabel, loading }}>
      {children}
    </SectionLabelsContext.Provider>
  );
}

export function useSectionLabels() {
  const ctx = useContext(SectionLabelsContext);
  if (!ctx) {
    // Fallback when used outside provider — returns defaults, no editing
    return {
      label: (_k: string, t: string, s = "") => ({ title: t, subtitle: s }),
      saveLabel: async () => false,
      loading: false,
    };
  }
  return ctx;
}
