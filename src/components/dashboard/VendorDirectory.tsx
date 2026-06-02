import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PORTAL_SHOWCASE } from "@/config/portalShowcase";
import VendorDirectoryShowcase from "@/components/dashboard/VendorDirectoryShowcase";
import { VendorDirectoryInner, type VendorListItem } from "@/components/dashboard/VendorDirectoryList";
import { useSectionLabels } from "@/hooks/useSectionLabels";

const VendorDirectory = () => {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { label } = useSectionLabels();
  const vendorsLabel = label("vendors", "Approved vendors", "Brokerage-approved trades and services — contact details for your deals");

  useEffect(() => {
    if (PORTAL_SHOWCASE) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("vendors")
          .select("id, category, business_name, contact_name, phone, email, website, sort_order")
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("business_name", { ascending: true });

        if (error) throw error;
        setVendors((data as VendorListItem[]) || []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not load vendors.";
        toast({ variant: "destructive", title: "Error", description: msg });
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (PORTAL_SHOWCASE) {
    return <VendorDirectoryShowcase />;
  }

  return (
    <div className="rounded-2xl border border-[#003865]/25 bg-gradient-to-br from-[#0f2744]/[0.08] via-card to-[#c41e3a]/[0.06] p-4 shadow-sm md:p-6">
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#003865] to-[#0f2744] text-white shadow-md ring-2 ring-[#c41e3a]/35">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <div className="mb-2 flex h-1 w-12 rounded-sm bg-gradient-to-r from-[#003865] to-[#c41e3a]" aria-hidden />
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#0f2744] dark:text-foreground md:text-3xl">
            {vendorsLabel.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {vendorsLabel.subtitle}
          </p>
        </div>
      </div>

      <VendorDirectoryInner
        vendors={vendors}
        loading={loading}
        emptyMessage="No vendors listed yet. Check back soon or contact the office."
      />
    </div>
  );
};

export default VendorDirectory;
