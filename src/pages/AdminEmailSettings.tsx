import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail, Save } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface EmailSettings {
  from_email: string;
  portal_name: string;
  worksheet_admin_email: string;
  worksheet_from_email: string;
}

const DEFAULTS: EmailSettings = {
  from_email: "noreply@agents.updates.joinremaxex.com",
  portal_name: "RE/MAX Excellence Portal",
  worksheet_admin_email: "",
  worksheet_from_email: "noreply@agents.updates.joinremaxex.com",
};

const KEY = "email_settings";

export default function AdminEmailSettings() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [form, setForm] = useState<EmailSettings>(DEFAULTS);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const load = async () => {
    setLoadingData(true);
    const { data } = await supabase.from("portal_settings").select("value").eq("key", KEY).maybeSingle();
    if (data?.value) {
      const v = data.value as Partial<EmailSettings>;
      setForm({
        from_email: v.from_email || DEFAULTS.from_email,
        portal_name: v.portal_name || DEFAULTS.portal_name,
        worksheet_admin_email: v.worksheet_admin_email || DEFAULTS.worksheet_admin_email,
        worksheet_from_email: v.worksheet_from_email || DEFAULTS.worksheet_from_email,
      });
    }
    setLoadingData(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("portal_settings").upsert(
      { key: KEY, value: form, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: "Email settings saved", description: "Changes take effect within 60 seconds." });
  };

  if (loading || (!isAdmin && user) || loadingData) {
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
          <h1 className="font-display text-xl font-semibold">Email Settings</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Portal Email Configuration</CardTitle>
            <CardDescription>
              Control the sender address and recipient routing for all portal emails.
              The sender ("From") must be an address on your verified Resend domain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Portal name (shown in email header)</Label>
              <Input
                value={form.portal_name}
                onChange={(e) => setForm({ ...form, portal_name: e.target.value })}
                placeholder="RE/MAX Excellence Portal"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Sender email ("From" address)</Label>
              <Input
                type="email"
                value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                placeholder="noreply@agents.updates.joinremaxex.com"
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Must be on your verified Resend domain (<code>agents.updates.joinremaxex.com</code>). All notifications, reminders, and booking confirmations come from this address.
              </p>
            </div>

            <div className="border-t pt-5">
              <Label>Pre-con worksheet — admin recipient</Label>
              <Input
                type="email"
                value={form.worksheet_admin_email}
                onChange={(e) => setForm({ ...form, worksheet_admin_email: e.target.value })}
                placeholder="admin@remaxex.com"
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                When an agent submits a pre-con worksheet, this email receives the admin copy.
              </p>
            </div>

            <div>
              <Label>Pre-con worksheet — sender email</Label>
              <Input
                type="email"
                value={form.worksheet_from_email}
                onChange={(e) => setForm({ ...form, worksheet_from_email: e.target.value })}
                placeholder="noreply@agents.updates.joinremaxex.com"
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                The "From" address on worksheet emails (both admin and agent copies).
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <strong>Note:</strong> Booking inquiry emails per office are managed in{" "}
              <button className="underline font-semibold" onClick={() => navigate("/admin/offices")}>
                Offices &amp; booking emails
              </button>
              . Each office has its own notification address.
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save email settings
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
