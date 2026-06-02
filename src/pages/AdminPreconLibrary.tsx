import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadFileToServer } from "@/hooks/useVideoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, FileText, Upload, Link as LinkIcon, ExternalLink,
} from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import UploadHint, { UPLOAD_PRESETS } from "@/components/admin/UploadHint";

interface LibraryDoc {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  file_url: string | null;
  link_url: string | null;
  file_name: string | null;
  sort_order: number;
  is_active: boolean;
}

const ICONS = ["📄", "📘", "📕", "📑", "📋", "📊", "📝", "📁", "🏠", "💰"];

export default function AdminPreconLibrary() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", icon: "📄", file_url: "", link_url: "", file_name: "", is_active: true,
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin]);

  useEffect(() => { if (isAdmin) fetchDocs(); }, [isAdmin]);

  const fetchDocs = async () => {
    setLoadingData(true);
    const { data } = await supabase.from("precon_library_documents").select("*").order("sort_order");
    setDocs((data as LibraryDoc[]) || []);
    setLoadingData(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", icon: "📄", file_url: "", link_url: "", file_name: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (d: LibraryDoc) => {
    setEditing(d);
    setForm({
      title: d.title, description: d.description || "", icon: d.icon,
      file_url: d.file_url || "", link_url: d.link_url || "", file_name: d.file_name || "", is_active: d.is_active,
    });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const result = await uploadFileToServer("precon-documents", file, "library");
    setUploading(false);
    if (result) {
      setForm((f) => ({ ...f, file_url: result.url, file_name: file.name, link_url: "" }));
      toast({ title: "File uploaded" });
    } else {
      toast({ variant: "destructive", title: "Upload failed" });
    }
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ variant: "destructive", title: "Title is required" }); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      icon: form.icon,
      file_url: form.file_url.trim() || null,
      link_url: form.link_url.trim() || null,
      file_name: form.file_name || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    if (editing) {
      const { error } = await supabase.from("precon_library_documents").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else { toast({ title: "Document updated" }); setDialogOpen(false); fetchDocs(); }
    } else {
      const { error } = await supabase.from("precon_library_documents").insert({ ...payload, sort_order: docs.length, created_by: user!.id });
      if (error) toast({ variant: "destructive", title: error.message });
      else { toast({ title: "Document added" }); setDialogOpen(false); fetchDocs(); }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await supabase.from("precon_library_documents").delete().eq("id", id);
    fetchDocs(); toast({ title: "Deleted" });
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
          <h1 className="font-display text-xl font-semibold">Pre-Con Document Library</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Document Library</h2>
            <p className="text-sm text-muted-foreground mt-1">Shared templates &amp; forms agents can download (Showing Instructions, Clauses, Schedule B, etc.)</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Document</Button>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{d.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{d.title}</p>
                          {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.file_url ? (
                        <Badge variant="outline" className="gap-1 text-xs"><Upload className="h-3 w-3" /> Uploaded file</Badge>
                      ) : d.link_url ? (
                        <a href={d.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <LinkIcon className="h-3 w-3" /> External link <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <Badge variant="secondary" className="text-xs">No file yet</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant={d.is_active ? "default" : "secondary"} className="text-xs">{d.is_active ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Document" : "Add Document"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ICONS.map((ic) => (
                    <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                      className={`text-lg rounded p-1 ${form.icon === ic ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-muted"}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Showing Instructions" />
                <Label className="mt-2 block">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-semibold">Attach a file or link</p>
              <label className="cursor-pointer block">
                <div className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-md text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : form.file_url ? "Replace uploaded file" : "Upload PDF / file"}
                </div>
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              </label>
              <UploadHint {...UPLOAD_PRESETS.documentPdf} />
              {form.file_url && <p className="text-xs text-green-600">✓ File attached: {form.file_name}</p>}
              <div className="relative">
                <div className="absolute inset-x-0 top-1/2 border-t border-muted" />
                <p className="relative bg-background px-2 text-xs text-muted-foreground w-fit mx-auto">or paste a link</p>
              </div>
              <div>
                <Label>External link (Google Drive, web)</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value, file_url: "" })} placeholder="https://drive.google.com/..." />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active (visible to agents)</Label>
            </div>
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
