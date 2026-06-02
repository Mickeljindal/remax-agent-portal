import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadFileToServer } from "@/hooks/useVideoUpload";
import UploadHint, { UPLOAD_PRESETS } from "@/components/admin/UploadHint";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, Tag, Building2,
  Upload, Image as ImageIcon, MapPin, SlidersHorizontal, FileText, Download,
} from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface TagItem { id: string; name: string; color: string; sort_order: number; is_active: boolean; }
interface PropertyType { id: string; name: string; sort_order: number; is_active: boolean; }
interface StatusItem { id: string; name: string; color: string; sort_order: number; is_active: boolean; }
interface City { id: string; name: string; sort_order: number; is_active: boolean; }

interface Project {
  id: string; name: string; developer: string | null; location: string | null;
  description: string | null; price_range: string | null; status: string;
  property_type: string; city_id: string | null; commission_rate_percent: number | null;
  commission_public: boolean | null; contact_phone: string | null;
  external_url: string | null; thumbnail_url: string | null;
  gallery_urls: string[]; is_active: boolean; is_new: boolean; is_featured: boolean;
  sort_order: number; created_at: string;
  precon_cities?: { name: string } | null;
}

interface ProjectTag { project_id: string; tag_id: string; }

const TAG_COLORS = ["red", "blue", "green", "amber", "orange", "purple", "indigo", "pink", "emerald", "cyan", "gray"];

export default function AdminListings() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTags, setProjectTags] = useState<ProjectTag[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Tag form
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagForm, setTagForm] = useState({ name: "", color: "blue" });

  // Property type form
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PropertyType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: "" });

  // Status form
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusItem | null>(null);
  const [statusForm, setStatusForm] = useState({ name: "", color: "blue" });

  // City form
  const [newCityName, setNewCityName] = useState("");

  // Project form
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: "", developer: "", location: "", description: "",
    price_range: "", status: "Now Selling", property_type: "Condo",
    city_id: "", commission_rate_percent: "", commission_public: true,
    contact_phone: "", phone_public: true, external_url: "", thumbnail_url: "",
    gallery_urls_input: "", is_active: true, is_new: false, is_featured: false,
    selectedTagIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Listing documents manager
  const [docsDialogProject, setDocsDialogProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("project_details");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin]);

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  const fetchAll = async () => {
    setLoadingData(true);
    const [t, pt, st, c, p, ptags] = await Promise.all([
      supabase.from("precon_tags").select("*").order("sort_order"),
      supabase.from("precon_property_types").select("*").order("sort_order"),
      supabase.from("precon_statuses").select("*").order("sort_order"),
      supabase.from("precon_cities").select("*").order("sort_order"),
      supabase.from("precon_projects").select("*, precon_cities(name)").order("sort_order"),
      supabase.from("precon_project_tags").select("*"),
    ]);
    setTags((t.data as TagItem[]) || []);
    setPropertyTypes((pt.data as PropertyType[]) || []);
    setStatuses((st.data as StatusItem[]) || []);
    setCities((c.data as City[]) || []);
    setProjects((p.data as Project[]) || []);
    setProjectTags((ptags.data as ProjectTag[]) || []);
    setLoadingData(false);
  };

  // ─── IMAGE UPLOAD (to KloudBean server) ────────────────────────
  const uploadImage = async (file: File, projectId: string): Promise<string | null> => {
    setUploading(true);
    const result = await uploadFileToServer("precon-images", file, projectId || "new");
    setUploading(false);
    if (!result) { toast({ variant: "destructive", title: "Upload failed" }); return null; }
    return result.url;
  };

  // ─── TAGS CRUD ─────────────────────────────────────────────────
  const saveTag = async () => {
    if (!tagForm.name.trim()) return;
    if (editingTag) {
      await supabase.from("precon_tags").update({ name: tagForm.name.trim(), color: tagForm.color }).eq("id", editingTag.id);
    } else {
      await supabase.from("precon_tags").insert({ name: tagForm.name.trim(), color: tagForm.color, sort_order: tags.length });
    }
    setTagDialogOpen(false); fetchAll(); toast({ title: editingTag ? "Tag updated" : "Tag created" });
  };
  const deleteTag = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    await supabase.from("precon_project_tags").delete().eq("tag_id", id);
    await supabase.from("precon_tags").delete().eq("id", id);
    fetchAll(); toast({ title: "Tag deleted" });
  };

  // ─── PROPERTY TYPES CRUD ───────────────────────────────────────
  const saveType = async () => {
    if (!typeForm.name.trim()) return;
    if (editingType) {
      await supabase.from("precon_property_types").update({ name: typeForm.name.trim() }).eq("id", editingType.id);
    } else {
      await supabase.from("precon_property_types").insert({ name: typeForm.name.trim(), sort_order: propertyTypes.length });
    }
    setTypeDialogOpen(false); fetchAll(); toast({ title: editingType ? "Type updated" : "Type created" });
  };
  const deleteType = async (id: string) => {
    if (!confirm("Delete this property type?")) return;
    await supabase.from("precon_property_types").delete().eq("id", id);
    fetchAll(); toast({ title: "Deleted" });
  };

  // ─── STATUSES CRUD ─────────────────────────────────────────────
  const saveStatus = async () => {
    if (!statusForm.name.trim()) return;
    if (editingStatus) {
      await supabase.from("precon_statuses").update({ name: statusForm.name.trim(), color: statusForm.color }).eq("id", editingStatus.id);
    } else {
      await supabase.from("precon_statuses").insert({ name: statusForm.name.trim(), color: statusForm.color, sort_order: statuses.length });
    }
    setStatusDialogOpen(false); fetchAll(); toast({ title: editingStatus ? "Status updated" : "Status created" });
  };
  const deleteStatus = async (id: string) => {
    if (!confirm("Delete this status?")) return;
    await supabase.from("precon_statuses").delete().eq("id", id);
    fetchAll(); toast({ title: "Deleted" });
  };

  // ─── CITIES CRUD ───────────────────────────────────────────────
  const addCity = async () => {
    if (!newCityName.trim()) return;
    await supabase.from("precon_cities").insert({ name: newCityName.trim(), sort_order: cities.length });
    setNewCityName(""); fetchAll(); toast({ title: "City added" });
  };
  const toggleCity = async (c: City) => {
    await supabase.from("precon_cities").update({ is_active: !c.is_active }).eq("id", c.id);
    fetchAll();
  };
  const deleteCity = async (id: string) => {
    if (!confirm("Delete this city?")) return;
    await supabase.from("precon_cities").delete().eq("id", id);
    fetchAll(); toast({ title: "City deleted" });
  };

  // ─── PROJECTS CRUD ─────────────────────────────────────────────
  const openNewProject = () => {
    setEditingProject(null);
    setProjectForm({
      name: "", developer: "", location: "", description: "",
      price_range: "", status: "Now Selling", property_type: "Condo",
      city_id: "", commission_rate_percent: "", commission_public: true,
      contact_phone: "", phone_public: true, external_url: "", thumbnail_url: "",
      gallery_urls_input: "", is_active: true, is_new: false, is_featured: false,
      selectedTagIds: [],
    });
    setProjectDialogOpen(true);
  };

  const openEditProject = (p: Project) => {
    setEditingProject(p);
    const gu = Array.isArray(p.gallery_urls) ? p.gallery_urls.join("\n") : "";
    const pTags = projectTags.filter((pt) => pt.project_id === p.id).map((pt) => pt.tag_id);
    setProjectForm({
      name: p.name, developer: p.developer || "", location: p.location || "",
      description: p.description || "", price_range: p.price_range || "",
      status: p.status, property_type: p.property_type,
      city_id: p.city_id || "", commission_rate_percent: p.commission_rate_percent?.toString() || "",
      commission_public: p.commission_public !== false,
      contact_phone: p.contact_phone || "", phone_public: (p as any).phone_public !== false,
      external_url: p.external_url || "",
      thumbnail_url: p.thumbnail_url || "", gallery_urls_input: gu,
      is_active: p.is_active, is_new: p.is_new || false, is_featured: p.is_featured || false,
      selectedTagIds: pTags,
    });
    setProjectDialogOpen(true);
  };

  const saveProject = async () => {
    if (!projectForm.name.trim() || !user) { toast({ variant: "destructive", title: "Name is required" }); return; }
    setSaving(true);
    const galleryLines = projectForm.gallery_urls_input.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      name: projectForm.name.trim(),
      developer: projectForm.developer.trim() || null,
      location: projectForm.location.trim() || null,
      description: projectForm.description.trim() || null,
      price_range: projectForm.price_range.trim() || null,
      status: projectForm.status,
      property_type: projectForm.property_type,
      city_id: projectForm.city_id || null,
      commission_rate_percent: projectForm.commission_rate_percent ? parseFloat(projectForm.commission_rate_percent) : null,
      commission_public: projectForm.commission_public,
      contact_phone: projectForm.contact_phone.trim() || null,
      phone_public: projectForm.phone_public,
      external_url: projectForm.external_url.trim() || null,
      thumbnail_url: projectForm.thumbnail_url.trim() || null,
      gallery_urls: galleryLines,
      is_active: projectForm.is_active,
      is_new: projectForm.is_new,
      is_featured: projectForm.is_featured,
    };

    let projectId: string;
    if (editingProject) {
      const { error } = await supabase.from("precon_projects").update(payload).eq("id", editingProject.id);
      if (error) { setSaving(false); toast({ variant: "destructive", title: error.message }); return; }
      projectId = editingProject.id;
    } else {
      const { data, error } = await supabase.from("precon_projects").insert({ ...payload, created_by: user.id }).select("id").single();
      if (error || !data) { setSaving(false); toast({ variant: "destructive", title: error?.message || "Failed" }); return; }
      projectId = data.id;
    }

    // Update tags
    await supabase.from("precon_project_tags").delete().eq("project_id", projectId);
    if (projectForm.selectedTagIds.length > 0) {
      await supabase.from("precon_project_tags").insert(
        projectForm.selectedTagIds.map((tagId) => ({ project_id: projectId, tag_id: tagId }))
      );
    }

    setSaving(false); setProjectDialogOpen(false); fetchAll();
    toast({ title: editingProject ? "Listing updated" : "Listing created" });
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await supabase.from("precon_project_tags").delete().eq("project_id", id);
    await supabase.from("precon_projects").delete().eq("id", id);
    fetchAll(); toast({ title: "Listing deleted" });
  };

  const getProjectTags = (projectId: string) => {
    const tagIds = projectTags.filter((pt) => pt.project_id === projectId).map((pt) => pt.tag_id);
    return tags.filter((t) => tagIds.includes(t.id));
  };

  // ─── LISTING DOCUMENTS ─────────────────────────────────────────
  const openDocs = async (project: Project) => {
    setDocsDialogProject(project);
    setDocTitle("");
    setDocType("project_details");
    const { data } = await supabase
      .from("precon_documents")
      .select("*")
      .eq("project_id", project.id)
      .order("sort_order");
    setDocs(data || []);
  };

  const uploadDocument = async (file: File) => {
    if (!docsDialogProject || !docTitle.trim()) {
      toast({ variant: "destructive", title: "Enter a document title first" });
      return;
    }
    setUploadingDoc(true);
    const result = await uploadFileToServer("precon-documents", file, docsDialogProject.id);
    if (!result) {
      setUploadingDoc(false);
      toast({ variant: "destructive", title: "Upload failed" });
      return;
    }
    const { error: insErr } = await supabase.from("precon_documents").insert({
      project_id: docsDialogProject.id,
      title: docTitle.trim(),
      doc_type: docType,
      file_url: result.url,
      file_name: file.name,
      file_size: file.size,
      sort_order: docs.length,
    });
    setUploadingDoc(false);
    if (insErr) toast({ variant: "destructive", title: insErr.message });
    else {
      toast({ title: "Document uploaded" });
      setDocTitle("");
      openDocs(docsDialogProject);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await supabase.from("precon_documents").delete().eq("id", id);
    if (docsDialogProject) openDocs(docsDialogProject);
    toast({ title: "Document deleted" });
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
          <h1 className="font-display text-xl font-semibold">Listings & Categories</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="listings">
          <TabsList className="mb-6">
            <TabsTrigger value="listings" className="gap-1"><Building2 className="h-4 w-4" /> Listings</TabsTrigger>
            <TabsTrigger value="tags" className="gap-1"><Tag className="h-4 w-4" /> Tags</TabsTrigger>
            <TabsTrigger value="types" className="gap-1"><SlidersHorizontal className="h-4 w-4" /> Property Types</TabsTrigger>
            <TabsTrigger value="statuses" className="gap-1"><SlidersHorizontal className="h-4 w-4" /> Statuses</TabsTrigger>
            <TabsTrigger value="cities" className="gap-1"><MapPin className="h-4 w-4" /> Cities</TabsTrigger>
          </TabsList>

          {/* ─── LISTINGS TAB ─────────────────────────────────────── */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{projects.length} listings total</p>
              <Button onClick={openNewProject} className="gap-2"><Plus className="h-4 w-4" /> Add Listing</Button>
            </div>
            {loadingData ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Co-op</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {p.thumbnail_url ? (
                              <img src={p.thumbnail_url} alt="" className="h-10 w-16 rounded object-cover" />
                            ) : (
                              <div className="h-10 w-16 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.developer || "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.precon_cities?.name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.property_type}</Badge></TableCell>
                        <TableCell><Badge className="text-xs">{p.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getProjectTags(p.id).map((t) => (
                              <Badge key={t.id} variant="outline" className={`text-[9px] bg-${t.color}-100 text-${t.color}-800`}>{t.name}</Badge>
                            ))}
                            {p.is_new && <Badge className="text-[9px] bg-red-500">New</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.commission_rate_percent != null ? `${p.commission_rate_percent}%` : "—"}</TableCell>
                        <TableCell><Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">{p.is_active ? "Yes" : "No"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDocs(p)} className="text-xs gap-1">
                              <FileText className="h-3.5 w-3.5" /> PDFs
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditProject(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteProject(p.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ─── TAGS TAB ─────────────────────────────────────────── */}
          <TabsContent value="tags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Listing Tags</CardTitle>
                <CardDescription>Tags appear as badges on listing cards (e.g. "New", "Hot", "Exclusive")</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => { setEditingTag(null); setTagForm({ name: "", color: "blue" }); setTagDialogOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Tag
                </Button>
                <div className="flex flex-wrap gap-3">
                  {tags.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                      <Badge className={`bg-${t.color}-500 text-white text-xs`}>{t.name}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingTag(t); setTagForm({ name: t.name, color: t.color }); setTagDialogOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteTag(t.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── PROPERTY TYPES TAB ───────────────────────────────── */}
          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Property Types</CardTitle>
                <CardDescription>Categories shown in the filter dropdown on the listings page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => { setEditingType(null); setTypeForm({ name: "" }); setTypeDialogOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Type
                </Button>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {propertyTypes.map((pt) => (
                      <TableRow key={pt.id}>
                        <TableCell className="font-medium">{pt.name}</TableCell>
                        <TableCell><Badge variant={pt.is_active ? "default" : "secondary"}>{pt.is_active ? "Yes" : "No"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingType(pt); setTypeForm({ name: pt.name }); setTypeDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteType(pt.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── STATUSES TAB ─────────────────────────────────────── */}
          <TabsContent value="statuses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Statuses</CardTitle>
                <CardDescription>Status badges shown on listing cards (e.g. "Active", "Coming Soon", "Sold Out")</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => { setEditingStatus(null); setStatusForm({ name: "", color: "blue" }); setStatusDialogOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Status
                </Button>
                <div className="flex flex-wrap gap-3">
                  {statuses.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                      <Badge className={`bg-${s.color}-500 text-white text-xs`}>{s.name}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingStatus(s); setStatusForm({ name: s.name, color: s.color }); setStatusDialogOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteStatus(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── CITIES TAB ───────────────────────────────────────── */}
          <TabsContent value="cities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Cities</CardTitle>
                <CardDescription>City filter options for the listings page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input className="max-w-xs" placeholder="New city name" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} />
                  <Button onClick={addCity} className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>City</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Delete</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cities.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Switch checked={c.is_active} onCheckedChange={() => toggleCity(c)} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCity(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── TAG DIALOG ───────────────────────────────────────────── */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingTag ? "Edit Tag" : "New Tag"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })} placeholder="e.g. Hot Deal" /></div>
            <div><Label>Color</Label>
              <Select value={tagForm.color} onValueChange={(v) => setTagForm({ ...tagForm, color: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TAG_COLORS.map((c) => <SelectItem key={c} value={c}><span className="capitalize">{c}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button><Button onClick={saveTag}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── TYPE DIALOG ──────────────────────────────────────────── */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingType ? "Edit Type" : "New Property Type"}</DialogTitle></DialogHeader>
          <div><Label>Name</Label><Input value={typeForm.name} onChange={(e) => setTypeForm({ name: e.target.value })} placeholder="e.g. Stacked Townhome" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancel</Button><Button onClick={saveType}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── STATUS DIALOG ────────────────────────────────────────── */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingStatus ? "Edit Status" : "New Status"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={statusForm.name} onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })} placeholder="e.g. VIP Launch" /></div>
            <div><Label>Color</Label>
              <Select value={statusForm.color} onValueChange={(v) => setStatusForm({ ...statusForm, color: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TAG_COLORS.map((c) => <SelectItem key={c} value={c}><span className="capitalize">{c}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button><Button onClick={saveStatus}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PROJECT/LISTING DIALOG ───────────────────────────────── */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProject ? "Edit Listing" : "Add Listing"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Project Name *</Label><Input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="e.g. Caivan Brampton Townhomes" /></div>
              <div><Label>Developer</Label><Input value={projectForm.developer} onChange={(e) => setProjectForm({ ...projectForm, developer: e.target.value })} placeholder="e.g. Mattamy Homes" /></div>
              <div><Label>Location / Area</Label><Input value={projectForm.location} onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })} placeholder="e.g. Brampton, ON" /></div>
              <div><Label>City</Label>
                <Select value={projectForm.city_id || "none"} onValueChange={(v) => setProjectForm({ ...projectForm, city_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{cities.filter((c) => c.is_active).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Property Type</Label>
                <Select value={projectForm.property_type} onValueChange={(v) => setProjectForm({ ...projectForm, property_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{propertyTypes.filter((pt) => pt.is_active).map((pt) => <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Sales Status</Label>
                <Select value={projectForm.status} onValueChange={(v) => setProjectForm({ ...projectForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.filter((s) => s.is_active).map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price Range</Label><Input value={projectForm.price_range} onChange={(e) => setProjectForm({ ...projectForm, price_range: e.target.value })} placeholder="From $689,900" /></div>
              <div><Label>Co-op Commission %</Label><Input type="number" step="0.01" value={projectForm.commission_rate_percent} onChange={(e) => setProjectForm({ ...projectForm, commission_rate_percent: e.target.value })} placeholder="2.5" /></div>
              <div><Label>Contact Phone</Label><Input value={projectForm.contact_phone} onChange={(e) => setProjectForm({ ...projectForm, contact_phone: e.target.value })} placeholder="(905) 555-0142" /></div>
              <div><Label>External URL</Label><Input value={projectForm.external_url} onChange={(e) => setProjectForm({ ...projectForm, external_url: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div><Label>Description</Label><Textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} rows={3} /></div>

            {/* Tags selection */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags.filter((t) => t.is_active).map((t) => {
                  const selected = projectForm.selectedTagIds.includes(t.id);
                  return (
                    <Badge
                      key={t.id}
                      variant={selected ? "default" : "outline"}
                      className={`cursor-pointer text-xs ${selected ? `bg-${t.color}-500 hover:bg-${t.color}-600` : ""}`}
                      onClick={() => {
                        setProjectForm({
                          ...projectForm,
                          selectedTagIds: selected
                            ? projectForm.selectedTagIds.filter((id) => id !== t.id)
                            : [...projectForm.selectedTagIds, t.id],
                        });
                      }}
                    >
                      {t.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label>Thumbnail Image</Label>
                <div className="flex items-center gap-3 mt-1">
                  {projectForm.thumbnail_url && <img src={projectForm.thumbnail_url} alt="" className="h-16 w-28 rounded object-cover" />}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                      <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload image"}
                    </div>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadImage(file, editingProject?.id || "new-" + Date.now());
                      if (url) setProjectForm({ ...projectForm, thumbnail_url: url });
                    }} />
                  </label>
                  <span className="text-xs text-muted-foreground">or paste URL:</span>
                  <Input className="flex-1" value={projectForm.thumbnail_url} onChange={(e) => setProjectForm({ ...projectForm, thumbnail_url: e.target.value })} placeholder="https://..." />
                </div>
                <UploadHint {...UPLOAD_PRESETS.listingThumbnail} />
              </div>
              <div>
                <Label>Gallery Image URLs (one per line)</Label>
                <Textarea value={projectForm.gallery_urls_input} onChange={(e) => setProjectForm({ ...projectForm, gallery_urls_input: e.target.value })} rows={3} placeholder="https://image1.jpg&#10;https://image2.jpg" />
                <UploadHint {...UPLOAD_PRESETS.listingGallery} />
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap items-center gap-6 border-t pt-4">
              <div className="flex items-center gap-2"><Switch checked={projectForm.is_new} onCheckedChange={(v) => setProjectForm({ ...projectForm, is_new: v })} /><Label>Mark as "New"</Label></div>
              <div className="flex items-center gap-2"><Switch checked={projectForm.is_featured} onCheckedChange={(v) => setProjectForm({ ...projectForm, is_featured: v })} /><Label>Featured</Label></div>
              <div className="flex items-center gap-2"><Switch checked={projectForm.commission_public} onCheckedChange={(v) => setProjectForm({ ...projectForm, commission_public: v })} /><Label>Show co-op % to agents</Label></div>
              <div className="flex items-center gap-2"><Switch checked={projectForm.phone_public} onCheckedChange={(v) => setProjectForm({ ...projectForm, phone_public: v })} /><Label>Show phone to agents</Label></div>
              <div className="flex items-center gap-2"><Switch checked={projectForm.is_active} onCheckedChange={(v) => setProjectForm({ ...projectForm, is_active: v })} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveProject} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingProject ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DOCUMENTS DIALOG ─────────────────────────────────────── */}
      <Dialog open={!!docsDialogProject} onOpenChange={(o) => !o && setDocsDialogProject(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> PDFs — {docsDialogProject?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Upload form */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold">Upload a document</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Floor Plans" />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project_details">Project Details</SelectItem>
                      <SelectItem value="price_list">Price List</SelectItem>
                      <SelectItem value="floor_plans">Floor Plans</SelectItem>
                      <SelectItem value="incentives">Incentives</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="cursor-pointer block">
                <div className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-md text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" /> {uploadingDoc ? "Uploading..." : "Choose PDF / file to upload"}
                </div>
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" className="hidden" disabled={uploadingDoc}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f); }} />
              </label>
              <UploadHint {...UPLOAD_PRESETS.documentPdf} />
            </div>

            {/* Document list */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">{docs.length} document{docs.length !== 1 ? "s" : ""}</p>
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No documents yet.</p>
              ) : (
                docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 border rounded-lg p-2.5">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{d.doc_type.replace(/_/g, " ")}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" download><Download className="h-4 w-4" /></a>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocument(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocsDialogProject(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
