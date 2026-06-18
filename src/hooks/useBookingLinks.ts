import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BookingLink {
  label: string;
  url: string;
  note?: string;
}

export interface BookingLinksSetting {
  title: string;
  subtitle: string;
  links: BookingLink[];
}

const DEFAULTS: BookingLinksSetting = {
  title: "Book a 1-on-1 meeting",
  subtitle: "Pick a time that works for you",
  links: [],
};

const KEY = "booking_links";

/**
 * Admin-managed booking links (Calendly, etc.) shown under the Support section.
 */
export function useBookingLinks() {
  const [setting, setSetting] = useState<BookingLinksSetting>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSetting = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("portal_settings").select("value").eq("key", KEY).maybeSingle();
    if (data?.value) {
      const v = data.value as Partial<BookingLinksSetting>;
      setSetting({
        title: v.title || DEFAULTS.title,
        subtitle: v.subtitle || DEFAULTS.subtitle,
        links: Array.isArray(v.links) ? v.links.filter((l) => l && l.url && l.label) : [],
      });
    } else {
      setSetting(DEFAULTS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSetting(); }, [fetchSetting]);

  const save = async (next: BookingLinksSetting) => {
    const { error } = await supabase.from("portal_settings").upsert(
      { key: KEY, value: next, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (!error) setSetting(next);
    return !error;
  };

  return { setting, loading, save, refetch: fetchSetting };
}
