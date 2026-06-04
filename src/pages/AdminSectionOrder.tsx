import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, ArrowUpDown, ChevronUp, ChevronDown, RotateCcw, Save, GripVertical } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import { useSectionOrder, SECTION_META, DEFAULT_SECTION_ORDER, type SectionKey } from "@/hooks/useSectionOrder";

export default function AdminSectionOrder() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { order, loading: loadingOrder, save } = useSectionOrder();
  const [draft, setDraft] = useState<SectionKey[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => { if (!loadingOrder) setDraft(order); }, [loadingOrder, order]);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await save(draft);
    setSaving(false);
    if (ok) toast({ title: "Order saved", description: "Agents will see sections in this order." });
    else toast({ variant: "destructive", title: "Could not save order" });
  };

  const handleReset = () => setDraft([...DEFAULT_SECTION_ORDER]);

  const dirty = draft.join(",") !== order.join(",");

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
          <h1 className="font-display text-xl font-semibold">Agent Portal Section Order</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-5">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ArrowUpDown className="h-6 w-6 text-primary" /> Reorder Sections</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Move sections up or down to change the order they appear on the agent dashboard. Save to apply for all agents.
          </p>
        </div>

        {loadingOrder ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <Card>
              <CardContent className="p-3 space-y-2">
                {draft.map((key, i) => (
                  <div key={key} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{SECTION_META[key].label}</p>
                      <code className="text-[11px] text-muted-foreground">{key}</code>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={i === draft.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset to default
              </Button>
              <Button className="gap-1.5" onClick={handleSave} disabled={saving || !dirty}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save order
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
