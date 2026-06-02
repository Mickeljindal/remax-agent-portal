import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MapPin, Pencil, Plus } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface City {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface Project {
  id: string;
  name: string;
  developer: string | null;
  location: string | null;
  description: string | null;
  price_range: string | null;
  status: string;
  property_type: string;
  city_id: string | null;
  commission_rate_percent: number | null;
  commission_public?: boolean | null;
  contact_phone: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  gallery_urls?: unknown;
  is_active: boolean;
  precon_cities?: { id: string; name: string } | null;
}

const emptyProject = (): Partial<Project> & { gallery_urls_input?: string } => ({
  name: "",
  developer: "",
  location: "",
  description: "",
  price_range: "",
  status: "selling",
  property_type: "condo",
  city_id: null,
  commission_rate_percent: null,
  commission_public: true,
  contact_phone: "",
  external_url: "",
  thumbnail_url: "",
  gallery_urls_input: "",
  is_active: true,
});

export default function AdminPreCon() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [busy, setBusy] = useState(true);
  const [newCity, setNewCity] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project> & { gallery_urls_input?: string }>(emptyProject());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) {
        navigate("/dashboard");
        toast({ variant: "destructive", title: "Access denied" });
      }
    }
  }, [user, loading, isAdmin, navigate]);

  const load = async () => {
    if (!isAdmin) return;
    setBusy(true);
    const [c, p] = await Promise.all([
      supabase.from("precon_cities").select("*").order("name"),
      supabase.from("precon_projects").select("*, precon_cities ( id, name )").order("name"),
    ]);
    setCities((c.data as City[]) || []);
    setProjects((p.data as Project[]) || []);
    setBusy(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const addCity = async () => {
    if (!newCity.trim()) return;
    const { error } = await supabase.from("precon_cities").insert({ name: newCity.trim(), sort_order: cities.length });
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: "City added" });
      setNewCity("");
      load();
    }
  };

  const toggleCity = async (city: City) => {
    const { error } = await supabase.from("precon_cities").update({ is_active: !city.is_active }).eq("id", city.id);
    if (!error) load();
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyProject());
    setDialogOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    const gu = Array.isArray(p.gallery_urls) ? (p.gallery_urls as string[]).filter((x) => typeof x === "string").join("\n") : "";
    setForm({ ...p, gallery_urls_input: gu });
    setDialogOpen(true);
  };

  const saveProject = async () => {
    if (!user?.id || !form.name?.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    setSaving(true);
    const galleryLines = (form.gallery_urls_input || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      name: form.name.trim(),
      developer: form.developer?.trim() || null,
      location: form.location?.trim() || null,
      description: form.description?.trim() || null,
      price_range: form.price_range?.trim() || null,
      status: form.status || "selling",
      property_type: form.property_type || "condo",
      city_id: form.city_id || null,
      commission_rate_percent:
        form.commission_rate_percent === null || form.commission_rate_percent === ("" as unknown as number)
          ? null
          : Number(form.commission_rate_percent),
      commission_public: form.commission_public !== false,
      contact_phone: form.contact_phone?.trim() || null,
      external_url: form.external_url?.trim() || null,
      thumbnail_url: form.thumbnail_url?.trim() || null,
      gallery_urls: galleryLines,
      is_active: form.is_active ?? true,
    };
    if (editing) {
      const { error } = await supabase.from("precon_projects").update(payload).eq("id", editing.id);
      setSaving(false);
      if (error) toast({ variant: "destructive", title: error.message });
      else {
        toast({ title: "Project updated" });
        setDialogOpen(false);
        load();
      }
    } else {
      const { error } = await supabase.from("precon_projects").insert({
        ...payload,
        created_by: user.id,
      });
      setSaving(false);
      if (error) toast({ variant: "destructive", title: error.message });
      else {
        toast({ title: "Project created" });
        setDialogOpen(false);
        load();
      }
    }
  };

  if (loading || (!isAdmin && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
          <h1 className="font-display text-xl font-semibold">Pre-con cities &amp; projects</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
          </TabsList>

          <TabsContent value="cities" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Cities for filters
                </CardTitle>
                <CardDescription>Agents only see cities that appear in active listings (dropdown is filtered).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Input className="max-w-xs" placeholder="City name" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
                  <Button onClick={addCity}>
                    <Plus className="h-4 w-4 mr-1" /> Add city
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cities.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>
                          <Switch checked={c.is_active} onCheckedChange={() => toggleCity(c)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openNew} className="gap-2">
                <Plus className="h-4 w-4" /> New project
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                {busy ? (
                  <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Co-op %</TableHead>
                        <TableHead>Co-op visible</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.precon_cities?.name || "—"}</TableCell>
                          <TableCell className="capitalize">{p.property_type}</TableCell>
                          <TableCell>{p.status}</TableCell>
                          <TableCell>{p.commission_rate_percent != null ? `${p.commission_rate_percent}%` : "—"}</TableCell>
                          <TableCell>{p.commission_public === false ? "Hidden" : "Yes"}</TableCell>
                          <TableCell className="max-w-[140px] truncate text-xs">{p.contact_phone?.trim() || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>City</Label>
                <Select
                  value={form.city_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, city_id: v === "none" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {cities.filter((c) => c.is_active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property type</Label>
                <Select value={form.property_type || "condo"} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="townhome">Townhome</SelectItem>
                    <SelectItem value="all">Mixed / all</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Status</Label>
                <Select value={form.status || "selling"} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="selling">Now selling</SelectItem>
                    <SelectItem value="coming soon">Coming soon</SelectItem>
                    <SelectItem value="Ready">Ready</SelectItem>
                    <SelectItem value="sold out">Sold out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Co-op % (optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={form.commission_rate_percent ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      commission_rate_percent: e.target.value === "" ? null : parseFloat(e.target.value),
                    }))
                  }
                />
                <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
                  <Switch
                    id="commission-public"
                    checked={form.commission_public !== false}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, commission_public: v }))}
                  />
                  <Label htmlFor="commission-public" className="cursor-pointer text-xs font-normal leading-snug">
                    Show co-op % to agents (off hides on listings, detail, and shared links)
                  </Label>
                </div>
              </div>
            </div>
            <div>
              <Label>Listing phone (optional)</Label>
              <Input
                placeholder="e.g. (905) 555-0100 — shown to agents with click-to-call"
                value={form.contact_phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Developer</Label>
              <Input value={form.developer || ""} onChange={(e) => setForm((f) => ({ ...f, developer: e.target.value }))} />
            </div>
            <div>
              <Label>Location / area</Label>
              <Input value={form.location || ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <Label>Price range</Label>
              <Input value={form.price_range || ""} onChange={(e) => setForm((f) => ({ ...f, price_range: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Thumbnail URL</Label>
              <Input value={form.thumbnail_url || ""} onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))} />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Recommended: <span className="font-medium">1600 x 900 px</span> (16:9). Minimum 1200 x 675 px for sharp listing cards.
              </p>
            </div>
            <div>
              <Label>Gallery image URLs</Label>
              <Textarea
                placeholder={"One image URL per line (shown in agent listing popup gallery)."}
                value={form.gallery_urls_input || ""}
                onChange={(e) => setForm((f) => ({ ...f, gallery_urls_input: e.target.value }))}
                rows={3}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Recommended: <span className="font-medium">1920 x 1080 px</span> (16:9). Keep all gallery images same ratio for a clean slider.
              </p>
            </div>
            <div>
              <Label>External URL</Label>
              <Input value={form.external_url || ""} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Active (visible to agents)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProject} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
