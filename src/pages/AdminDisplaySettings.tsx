import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useListingsPagination } from "@/hooks/useListingsPagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, LayoutGrid, Save } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

export default function AdminDisplaySettings() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { setting, loading: loadingSetting, save } = useListingsPagination();
  const [pageSize, setPageSize] = useState(6);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin]);

  useEffect(() => {
    setPageSize(setting.page_size);
    setEnabled(setting.enabled);
  }, [setting]);

  const handleSave = async () => {
    const size = Math.max(1, Math.min(48, Number(pageSize) || 6));
    setSaving(true);
    const ok = await save({ page_size: size, enabled });
    setSaving(false);
    if (ok) toast({ title: "Saved", description: "Listing pagination updated for all agents." });
    else toast({ variant: "destructive", title: "Could not save" });
  };

  if (loading || (!isAdmin && user) || loadingSetting) {
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
          <h1 className="font-display text-xl font-semibold">Display Settings</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-primary" /> Listings pagination</CardTitle>
            <CardDescription>Control how many pre-construction listings agents see before "Show more".</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">Enable pagination</Label>
                <p className="text-xs text-muted-foreground">When off, all listings show at once.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div>
              <Label>Listings per page</Label>
              <Input
                type="number"
                min={1}
                max={48}
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value) || 0)}
                disabled={!enabled}
                className="mt-1 max-w-[140px]"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Default is 6. Agents see this many first, then click "Show more listings" to load another {pageSize || 6}.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
