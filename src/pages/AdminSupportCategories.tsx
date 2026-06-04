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
import {
  ArrowLeft, Loader2, LifeBuoy, Plus, Trash2, Save, ChevronUp, ChevronDown, Pencil,
} from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import { useSupportCategories, type SupportCategory } from "@/hooks/useSupportCategories";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export default function AdminSupportCategories() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { categories, loading: loadingCats, refetch } = useSupportCategories({ includeInactive: true });
  const [rows, setRows] = useState<SupportCategory[]>([]);
  const [editing, setEditing] = useState<SupportCategory | null>(null);
  const [form, setForm] = useState({ key: "", label: "", description: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => { if (!loadingCats) setRows(categories); }, [loadingCats, categories]);

  const openNew = () => { setEditing(null); setForm({ key: "", label: "", description: "" }); setDialogOpen(true); };
  const openEdit = (c: SupportCategory) => {
    setEditing(c);
    setForm({ key: c.key, label: c.label, description: c.description || "" });
    setDialogOpen(true);
  };

  const saveCategory = async () => {
    const label = form.label.trim();
    if (!label) { toast({ variant: "destructive", title: "Enter a category name" }); return; }
    const key = (editing ? editing.key : (form.key.trim() || slugify(label))) || slugify(label);
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("support_categories")
        .update({ label, description: form.description.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      setSaving(false);
      if (error) { toast({ variant: "destructive", title: error.message }); return; }
    } else {
      const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from("support_categories")
        .insert({ key, label, description: form.description.trim() || null, sort_order: nextOrder });
      setSaving(false);
      if (error) {
        toast({ variant: "destructive", title: error.message.includes("duplicate") ? "That category key already exists" : error.message });
        return;
      }
    }
    setDialogOpen(false);
    refetch();
    toast({ title: editing ? "Category updated" : "Category added" });
  };

  const toggleActive = async (c: SupportCategory) => {
    const { error } = await supabase
      .from("support_categories")
      .update({ is_active: !c.is_active, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, is_active: !r.is_active } : r))); }
  };

  const removeCategory = async (c: SupportCategory) => {
    const { error } = await supabase.from("support_categories").delete().eq("id", c.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { refetch(); toast({ title: "Category removed" }); }
  };

  const reorder = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    // Persist new sort_order for both swapped rows.
    await Promise.all(
      next.map((r, i) =>
        supabase.from("support_categories").update({ sort_order: i, updated_at: new Date().toISOString() }).eq("id", r.id)
      )
    );
    refetch();
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
          <h1 className="font-display text-xl font-semibold">Support Categories</h1>
          <Button onClick={openNew} className="gap-2 bg-white/10 hover:bg-white/20 text-primary-foreground">
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-5">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><LifeBuoy className="h-6 w-6 text-primary" /> Support Categories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            These are the topics agents pick when opening a support ticket (e.g. Marketing Support, Vendors, Tech).
            Add, rename, reorder, or hide categories. Hidden categories stay on past tickets but can't be chosen for new ones.
          </p>
        </div>

        {loadingCats ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No categories yet. Add the first one.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-3 space-y-2">
              {rows.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3">
                  <div className="flex flex-col">
                    <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0} onClick={() => reorder(i, -1)} aria-label="Move up">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === rows.length - 1} onClick={() => reorder(i, 1)} aria-label="Move down">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${!c.is_active ? "text-muted-foreground line-through" : ""}`}>{c.label}</p>
                    {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                    <code className="text-[11px] text-muted-foreground">{c.key}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                      <span className="text-[11px] text-muted-foreground w-12">{c.is_active ? "Active" : "Hidden"}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeCategory(c)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Marketing Support" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short helper text (optional)" />
            </div>
            {!editing && (
              <p className="text-[11px] text-muted-foreground">
                A unique key will be generated automatically{form.label ? <>: <code>{slugify(form.label)}</code></> : ""}.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCategory} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
