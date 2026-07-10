import { useEffect, useState } from "react";
import {
  HeartHandshake, Users, FileCheck, CreditCard,
  FileText, Presentation, ImageIcon, Mic, Briefcase, FolderOpen, LinkIcon,
  Download, ExternalLink, Loader2, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface KitItem {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  file_url: string | null;
  link_url: string | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
  file: FileText,
  presentation: Presentation,
  image: ImageIcon,
  mic: Mic,
  briefcase: Briefcase,
  folder: FolderOpen,
  link: LinkIcon,
};

type CardDef = {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
} & (
  | { action: "scroll"; targetId: string }
  | { action: "kit"; kit: string }
);

const cards: CardDef[] = [
  {
    title: "Marketing support",
    subtitle: "Request marketing assistance",
    Icon: HeartHandshake,
    action: "scroll",
    targetId: "support-tickets",
  },
  {
    title: "Vendors",
    subtitle: "Approved vendor list and contacts",
    Icon: Users,
    action: "scroll",
    targetId: "vendors",
  },
  {
    title: "Deal processing",
    subtitle: "How to submit a deal & required documents",
    Icon: FileCheck,
    action: "kit",
    kit: "deal-processing",
  },
  {
    title: "Direct deposit info",
    subtitle: "Information required & process explained",
    Icon: CreditCard,
    action: "kit",
    kit: "direct-deposit",
  },
];

/** Fetches and renders the admin-managed items for a support kit. */
function SupportKitContent({ kit }: { kit: string }) {
  const [items, setItems] = useState<KitItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("resource_kit_items")
        .select("id,title,description,icon,file_url,link_url")
        .eq("kit", kit)
        .eq("is_active", true)
        .order("sort_order");
      if (active) {
        setItems((data as KitItem[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [kit]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        These resources are being added. Please check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon] || FileText;
        const url = item.file_url || item.link_url;
        const isLink = !item.file_url && !!item.link_url;
        return (
          <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1a4d8f]/10">
              <Icon className="h-5 w-5 text-[#1a4d8f]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              )}
            </div>
            {url && (
              <Button size="sm" variant="outline" className="shrink-0 gap-1.5" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {isLink ? <><ExternalLink className="h-3.5 w-3.5" /> Open</> : <><Download className="h-3.5 w-3.5" /> Download</>}
                </a>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SupportResourceCards() {
  const [openCard, setOpenCard] = useState<{ kit: string; title: string; subtitle: string } | null>(null);

  const onCard = (card: CardDef) => {
    if (card.action === "scroll") {
      document.getElementById(card.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setOpenCard({ kit: card.kit, title: card.title, subtitle: card.subtitle });
  };

  return (
    <div className="mb-8">
      <div className="mb-2 h-1 w-8 rounded-sm bg-[hsl(4_80%_56%)]" aria-hidden />
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">Support</h2>
      <p className="mt-1 text-sm text-muted-foreground">Quick links for common brokerage resources</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const { title, subtitle, Icon } = card;
          return (
            <button
              key={title}
              type="button"
              onClick={() => onCard(card)}
              className="flex w-full gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!openCard} onOpenChange={(o) => !o && setOpenCard(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{openCard?.title}</DialogTitle>
            <DialogDescription>{openCard?.subtitle}</DialogDescription>
          </DialogHeader>
          {openCard && <SupportKitContent kit={openCard.kit} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
