import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Type, RotateCcw, Save } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

// All editable agent-dashboard section headings (key + the in-app defaults)
const SECTIONS = [
  { key: "dashboard", defaultTitle: "Dashboard", defaultSubtitle: "Calendar and training at a glance" },
  { key: "courses", defaultTitle: "Training & courses", defaultSubtitle: "Video modules, quizzes, and certificates" },
  { key: "listings", defaultTitle: "Pre-construction listings", defaultSubtitle: "Projects, pricing, and client registration" },
  { key: "assets", defaultTitle: "Pre-con assets", defaultSubtitle: "Tools, documents, and marketing" },
  { key: "precon-library", defaultTitle: "Pre-con document library", defaultSubtitle: "Shared brokerage forms and templates" },
  { key: "buyer-kit", defaultTitle: "Buyer presentation kit", defaultSubtitle: "Templates and talking points for buyer meetings." },
  { key: "listing-kit", defaultTitle: "Listing presentation kit", defaultSubtitle: "Everything you need to win the listing appointment" },
  { key: "success-kit", defaultTitle: "Agent success kit", defaultSubtitle: "Scripts, social media designs, and the content bank" },
  { key: "vendors", defaultTitle: "Approved vendors", defaultSubtitle: "Brokerage-approved trades and services — contact details for your deals" },
  { key: "support", defaultTitle: "Marketing & Tech Support", defaultSubtitle: "Get help from our support team" },
  { key: "offices", defaultTitle: "Office Locations & Booking", defaultSubtitle: "Reserve a meeting room — pick a location, day, and time" },
  { key: "calc-hst", defaultTitle: "HST & commission payout calculator", defaultSubtitle: "Commission is calculated on the net-of-HST base only (not on the HST amount)." },
  { key: "calc-coop", defaultTitle: "Co-op commission estimate (net of HST)", defaultSubtitle: "Commission is calculated from the net price before HST." },
];

interface Row { title: string; subtitle: string; }

export default function AdminSectionTitles() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [values, setValues] = useState<Record<string, Row>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const load = async () => {
    setLoadingData(true);
    const { data } = await supabase.from("section_labels").select("*");
    const map: Record<string, Row> = {};
    SECTIONS.forEach((s) => {
      const o = (data || []).find((r: any) => r.section_key === s.key);
      map[s.key] = {
        title: o?.title || s.defaultTitle,
        subtitle: o?.subtitle || s.defaultSubtitle,
      };
    });
    setValues(map);
    setLoadingData(false);
  };

  const save = async (key: string) => {
    setSavingKey(key);
    const v = values[key];
    const { error } = await supabase.from("section_labels").upsert(
      { section_key: key, title: v.title, subtitle: v.subtitle, updated_at: new Date().toISOString() },
      { onConflict: "section_key" }
    );
    setSavingKey(null);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: "Saved", description: "Agents will see the updated heading." });
  };

  const reset = (key: string) => {
    const def = SECTIONS.find((s) => s.key === key)!;
    setValues((prev) => ({ ...prev, [key]: { title: def.defaultTitle, subtitle: def.defaultSubtitle } }));
  };

  if (loading || (!isAdmin && user)) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={remaxLogo} alt="" className="h-10 w-auto brightness-0 invert object-contain" />
          </div>
          <h1 className="font-display text-xl font-semibold">Agent Portal Section Titles</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-5">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Type className="h-6 w-6 text-primary" /> Section Headings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Rename the section titles and subtitles agents see on their dashboard. Changes apply instantly after saving.
          </p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          SECTIONS.map((s) => {
            const v = values[s.key] || { title: "", subtitle: "" };
            return (
              <Card key={s.key}>
                <CardContent className="pt-5 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input value={v.title} onChange={(e) => setValues((p) => ({ ...p, [s.key]: { ...p[s.key], title: e.target.value } }))} placeholder={s.defaultTitle} />
                    </div>
                    <div>
                      <Label className="text-xs">Subtitle</Label>
                      <Input value={v.subtitle} onChange={(e) => setValues((p) => ({ ...p, [s.key]: { ...p[s.key], subtitle: e.target.value } }))} placeholder={s.defaultSubtitle} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Section: <code className="rounded bg-muted px-1">{s.key}</code></span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => reset(s.key)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reset
                      </Button>
                      <Button size="sm" className="gap-1.5" onClick={() => save(s.key)} disabled={savingKey === s.key}>
                        {savingKey === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
