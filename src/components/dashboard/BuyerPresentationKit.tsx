import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, ImageIcon, Mic, Presentation, Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSectionLabels } from "@/hooks/useSectionLabels";

interface KitItem {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  file_url: string | null;
  link_url: string | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  file: FileText,
  presentation: Presentation,
  image: ImageIcon,
  mic: Mic,
  briefcase: Briefcase,
};

export default function BuyerPresentationKit() {
  const [items, setItems] = useState<KitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { label } = useSectionLabels();
  const kitLabel = label("buyer-kit", "Buyer presentation kit", "Templates and talking points for buyer meetings.");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("buyer_kit_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setItems((data as KitItem[]) || []);
      setLoading(false);
    })();
  }, []);

  const open = (item: KitItem) => {
    const url = item.file_url || item.link_url;
    if (!url) {
      toast({ title: item.title, description: "No file attached yet — an admin can add it." });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section id="buyer-kit" className="scroll-mt-28 space-y-4">
      <div className="flex items-center gap-3">
        <Briefcase className="h-7 w-7 text-accent" />
        <div>
          <div className="mb-1 h-1 w-8 rounded-sm bg-[hsl(4_80%_56%)]" aria-hidden />
          <h2 className="font-display text-2xl font-bold text-foreground">{kitLabel.title}</h2>
          <p className="text-sm text-muted-foreground">
            {kitLabel.subtitle}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No buyer kit resources yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon] || FileText;
            const hasFile = !!(item.file_url || item.link_url);
            return (
              <Card key={item.id} className="border-border/80 bg-card/90 shadow-sm transition hover:border-[#1a4d8f]/30">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a4d8f]/10">
                    <Icon className="h-5 w-5 text-[#1a4d8f]" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={hasFile ? "default" : "outline"}
                    className="mt-auto w-full gap-1.5"
                    onClick={() => open(item)}
                  >
                    {hasFile ? (
                      item.file_url ? <><Download className="h-3.5 w-3.5" /> Download</> : <><ExternalLink className="h-3.5 w-3.5" /> Open</>
                    ) : "Coming soon"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
