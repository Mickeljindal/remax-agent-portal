import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadFileToServer } from "@/hooks/useVideoUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, Briefcase, Upload, Link as LinkIcon, ExternalLink,
  ChevronUp, ChevronDown,
} from "lucide-react";
import UploadHint, { UPLOAD_PRESETS } from "@/components/admin/UploadHint";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface KitItem {
  id: string; title: string; description: string | null; icon: string;
  file_url: string | null; link_url: string | null; file_name: string | null;
  sort_order: number; is_active: boolean;
}

const ICONS = ["file", "presentation", "image", "mic", "briefcase", "folder", "link"];

interface AdminResourceKitProps {
  kit: string;            // 'listing' | 'success'
  pageTitle: string;
  pageDescription: string;
}

export default function AdminResourceKit({ kit, pageTitle, pageDescription }: AdminResourceKitProps) {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [items, setItems] = useState<KitItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KitItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const blank = { title: "", description: "", icon: "file", file_url: "", link_url: "", file_name: "", is_active: true };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin]);

  useEffect(() => { if (isAdmin) fetchItems(); /* eslint-disable-next-line */ }, [isAdmin, kit]);

  const fetchItems = async () => {
    setLoadingData(true);
    const { data } = await supabase.from("resource_kit_items").select("*").eq("kit", kit).order("sort_order");
    setItems((data as KitItem[]) || []);
    setLoadingData(false);
  };

  const openNew = () => { setEditing(null); setForm(blank); setDialogOpen(true); };
  const openEdit = (i: KitItem) => {
    setEditing(i);
    setForm({ title: i.title, description: i.description || "", icon: i.icon, file_url: i.file_url || "", link_url: i.link_url || "", file_name: i.file_name || "", is_active: i.is_active });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const result = await uploadFileToServer("precon-documents", file, `kit-${kit}`);
    setUploading(false);
    if (result) { setForm((f) => ({ ...f, file_url: result.url, file_name: file.name, link_url: "" })); toast({ title: "File uploaded" }); }
    else toast({ variant: "destructive", title: "Upload failed" });
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ variant: "destructive", title: "Title is required" }); return; }
    setSaving(true);
    const payload = {
      kit, title: form.title.trim(), description: form.description.trim() || null, icon: form.icon,
      file_url: form.file_url.trim() || null, link_url: form.link_url.trim() || null,
      file_name: form.file_name || null, is_active: form.is_active, updated_at: new Date().toISOString(),
    };
    if (editing) {
      const { error } = await supabase.from("resource_kit_items").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else { toast({ title: "Updated" }); setDialogOpen(false); fetchItems(); }
    } else {
      const nextOrder = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
      const { error } = await supabase.from("resource_kit_items").insert({ ...payload, sort_order: nextOrder, created_by: user!.id });
      if (error) toast({ variant: "destructive", title: error.message });
      else { toast({ title: "Item added" }); setDialogOpen(false); fetchItems(); }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from("resource_kit_items").delete().eq("id", id);
    fetchItems(); toast({ title: "Deleted" });
  };

  const move = async (index: number, dir: -1 | 1) => {
    const t = index + dir;
    if (t < 0 || t >= items.length) return;
    const next = [...items];
    [next[index], next[t]] = [next[t], next[index]];
    setItems(next);
    await Promise.all(next.map((it, i) =>
      supabase.from("resource_kit_items").update({ sort_order: i, updated_at: new Date().toISOString() }).eq("id", it.id)
    ));
    fetchItems();
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
          <h1 className="font-display text-xl font-semibold">{pageTitle}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> {pageTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1">{pageDescription}</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Resource</Button>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead><TableHead>Resource</TableHead><TableHead>Source</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i, idx) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === 0} onClick={() => move(idx, -1)}><ChevronUp className="h-4 w-4" /></button>
                        <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === items.length - 1} onClick={() => move(idx, 1)}><ChevronDown className="h-4 w-4" /></button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{i.title}</p>
                      {i.description && <p className="text-xs text-muted-foreground">{i.description}</p>}
                    </TableCell>
                    <TableCell>
                      {i.file_url ? <Badge variant="outline" className="gap-1 text-xs"><Upload className="h-3 w-3" /> File</Badge>
                        : i.link_url ? <a href={i.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><LinkIcon className="h-3 w-3" /> Link <ExternalLink className="h-3 w-3" /></a>
                        : <Badge variant="secondary" className="text-xs">No file</Badge>}
                    </TableCell>
                    <TableCell><Badge variant={i.is_active ? "default" : "secondary"} className="text-xs">{i.is_active ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Resource" : "Add Resource"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Listing presentation deck" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div>
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ICONS.map((ic) => <SelectItem key={ic} value={ic}><span className="capitalize">{ic}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-semibold">Attach a file or link (folder)</p>
              <label className="cursor-pointer block">
                <div className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-md text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : form.file_url ? "Replace file" : "Upload file"}
                </div>
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              </label>
              <UploadHint {...UPLOAD_PRESETS.documentPdf} />
              {form.file_url && <p className="text-xs text-green-600">✓ {form.file_name}</p>}
              <div>
                <Label>External link / folder (Dropbox, Drive, Canva…)</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value, file_url: "" })} placeholder="https://www.dropbox.com/scl/fo/..." />
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
