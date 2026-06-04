import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Building2, Plus, Trash2, Save, Mail, Pencil } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface Office {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  notification_email: string | null;
  is_active: boolean;
  sort_order: number;
}

const blankForm = { name: "", address: "", phone: "", notification_email: "" };

export default function AdminOffices() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [offices, setOffices] = useState<Office[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editing, setEditing] = useState<Office | null>(null);
  const [form, setForm] = useState(blankForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const load = async () => {
    setLoadingData(true);
    const { data } = await supabase.from("office_locations").select("*").order("sort_order");
    setOffices((data as Office[]) || []);
    setLoadingData(false);
  };

  const openNew = () => { setEditing(null); setForm(blankForm); setDialogOpen(true); };
  const openEdit = (o: Office) => {
    setEditing(o);
    setForm({ name: o.name, address: o.address || "", phone: o.phone || "", notification_email: o.notification_email || "" });
    setDialogOpen(true);
  };

  const saveOffice = async () => {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Enter an office name" }); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      notification_email: form.notification_email.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("office_locations").update(payload).eq("id", editing.id);
      setSaving(false);
      if (error) { toast({ variant: "destructive", title: error.message }); return; }
    } else {
      const nextOrder = offices.length ? Math.max(...offices.map((o) => o.sort_order)) + 1 : 0;
      const { error } = await supabase.from("office_locations").insert({ ...payload, sort_order: nextOrder, is_active: true });
      setSaving(false);
      if (error) { toast({ variant: "destructive", title: error.message }); return; }
    }
    setDialogOpen(false);
    load();
    toast({ title: editing ? "Office updated" : "Office added" });
  };

  const toggleActive = async (o: Office) => {
    const { error } = await supabase.from("office_locations").update({ is_active: !o.is_active }).eq("id", o.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else setOffices((prev) => prev.map((x) => (x.id === o.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const removeOffice = async (o: Office) => {
    const { error } = await supabase.from("office_locations").delete().eq("id", o.id);
    if (error) toast({ variant: "destructive", title: error.message.includes("foreign") ? "Remove this office's rooms/bookings first." : error.message });
    else { load(); toast({ title: "Office removed" }); }
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
          <h1 className="font-display text-xl font-semibold">Offices & Booking Emails</h1>
          <Button onClick={openNew} className="gap-2 bg-white/10 hover:bg-white/20 text-primary-foreground">
            <Plus className="h-4 w-4" /> Add Office
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-5">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Office Locations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage office locations and set who receives room-booking inquiries for each office. Each booking emails its
            office's notification address (e.g. Mississauga → Shizu, Brampton → front desk).
          </p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : offices.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No offices yet. Add the first one.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {offices.map((o) => (
              <Card key={o.id}>
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className={`font-semibold ${!o.is_active ? "text-muted-foreground line-through" : ""}`}>{o.name}</p>
                    {o.address && <p className="text-sm text-muted-foreground">{o.address}</p>}
                    {o.phone && <p className="text-xs text-muted-foreground">{o.phone}</p>}
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
                      <Mail className="h-3.5 w-3.5 text-[#1a4d8f]" />
                      {o.notification_email
                        ? <span className="font-medium text-foreground">{o.notification_email}</span>
                        : <span className="text-amber-600">No inquiry email set</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={o.is_active} onCheckedChange={() => toggleActive(o)} />
                      <span className="text-[11px] text-muted-foreground w-12">{o.is_active ? "Active" : "Hidden"}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeOffice(o)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit office" : "Add office"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Office name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mississauga Office" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, city, postal code" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(905) 000-0000" />
            </div>
            <div>
              <Label>Booking inquiry email</Label>
              <Input
                type="email"
                value={form.notification_email}
                onChange={(e) => setForm({ ...form, notification_email: e.target.value })}
                placeholder="who-gets-inquiries@remaxex.com"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                All room bookings at this office are emailed here.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveOffice} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
