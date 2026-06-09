import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Store,
  Save,
} from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import { useAdminCardLabels } from "@/hooks/useAdminCardLabels";

interface VendorRow {
  id: string;
  category: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const emptyForm = () => ({
  category: "",
  business_name: "",
  contact_name: "",
  phone: "",
  email: "",
  website: "",
  notes: "",
  is_active: true,
  sort_order: 0,
});

const AdminVendors = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { label: cardLabel } = useAdminCardLabels();
  const pageLabel = cardLabel("vendors", "Approved vendors", "Trades and services shown on the agent dashboard");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VendorRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/dashboard");
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to manage vendors.",
        });
      }
    }
  }, [user, loading, isAdmin, navigate]);

  const fetchVendors = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("business_name", { ascending: true });

      if (error) throw error;
      setVendors((data as VendorRow[]) || []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load vendors.";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchVendors();
  }, [isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (v: VendorRow) => {
    setEditing(v);
    setForm({
      category: v.category,
      business_name: v.business_name,
      contact_name: v.contact_name || "",
      phone: v.phone || "",
      email: v.email || "",
      website: v.website || "",
      notes: v.notes || "",
      is_active: v.is_active,
      sort_order: v.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const cat = form.category.trim();
    const name = form.business_name.trim();
    if (!cat || !name) {
      toast({ variant: "destructive", title: "Required fields", description: "Category and business name are required." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: cat,
        business_name: name,
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
        sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
      };

      if (editing) {
        const { error } = await supabase.from("vendors").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Vendor updated", description: name });
      } else {
        const { error } = await supabase.from("vendors").insert({
          ...payload,
          created_by: user.id,
        });
        if (error) throw error;
        toast({ title: "Vendor added", description: name });
      }

      setDialogOpen(false);
      await fetchVendors();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Save failed.";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("vendors").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Vendor removed", description: deleteTarget.business_name });
      setDeleteTarget(null);
      await fetchVendors();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Delete failed.";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = vendors.filter(
    (v) =>
      v.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.contact_name && v.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.email && v.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading || (!isAdmin && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img
              src={remaxLogo}
              alt="REMAX Excellence"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
          </div>
          <h1 className="font-display text-xl font-semibold">{pageLabel.title}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                {pageLabel.title}
              </CardTitle>
              <CardDescription>
                {pageLabel.description}
              </CardDescription>
            </div>
            <Button onClick={openCreate} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add vendor
            </Button>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by business, category, contact, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loadingList ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                {searchQuery ? "No vendors match your search." : "No vendors yet. Add your first approved vendor."}
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.category}</TableCell>
                        <TableCell>{v.business_name}</TableCell>
                        <TableCell className="text-muted-foreground">{v.contact_name || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{v.phone || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{v.email || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={v.is_active ? "default" : "secondary"}>
                            {v.is_active ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="mr-2" onClick={() => openEdit(v)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteTarget(v)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit vendor" : "Add vendor"}</DialogTitle>
            <DialogDescription>
              Agents see active vendors grouped by category on the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="v-category">Category</Label>
              <Input
                id="v-category"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Plumber, Electrician, HVAC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-business">Business name</Label>
              <Input
                id="v-business"
                value={form.business_name}
                onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
                placeholder="Company or trade name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-contact">Contact name</Label>
              <Input
                id="v-contact"
                value={form.contact_name}
                onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="v-phone">Phone</Label>
                <Input
                  id="v-phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(416) 555-0100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-sort">Sort order</Label>
                <Input
                  id="v-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-email">Email</Label>
              <Input
                id="v-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-web">Website</Label>
              <Input
                id="v-web"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-notes">Internal notes</Label>
              <Textarea
                id="v-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Admin-only — not shown on the agent dashboard"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Visible to agents</Label>
                <p className="text-xs text-muted-foreground">Turn off to hide without deleting</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes {deleteTarget?.business_name} from the directory. Agents will no longer see this entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminVendors;
