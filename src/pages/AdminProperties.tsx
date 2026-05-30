import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePropertyImageUpload } from "@/hooks/useVideoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Image as ImageIcon,
  DollarSign,
  MapPin,
} from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface Property {
  id: string;
  title: string;
  address: string;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  property_type: string;
  listing_type: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  description: string | null;
  mls_number: string | null;
  status: string;
  thumbnail_url: string | null;
  gallery_urls: string[];
  assigned_agent_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Agent {
  id: string;
  full_name: string | null;
  reco_number: string;
}

const PROPERTY_TYPES = ["Residential", "Condo", "Townhouse", "Commercial", "Land", "Multi-Family"];
const LISTING_TYPES = ["Sale", "Lease"];
const STATUSES = ["Active", "Sold", "Pending", "Expired", "Coming Soon"];

export default function AdminProperties() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { uploading, uploadImage } = usePropertyImageUpload();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    address: "",
    city: "",
    province: "Ontario",
    postal_code: "",
    property_type: "Residential",
    listing_type: "Sale",
    price: "",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    description: "",
    mls_number: "",
    status: "Active",
    assigned_agent_id: "",
    is_active: true,
    thumbnail_url: "",
    gallery_urls: [] as string[],
  });

  useEffect(() => {
    if (!loading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) {
        navigate("/dashboard");
        toast({ variant: "destructive", title: "Access denied" });
      }
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    const [propsRes, agentsRes] = await Promise.all([
      supabase.from("properties").select("*").order("created_at", { ascending: false }),
      supabase.from("agents").select("id, full_name, reco_number").eq("is_active", true).order("full_name"),
    ]);
    setProperties((propsRes.data as Property[]) || []);
    setAgents((agentsRes.data as Agent[]) || []);
    setLoadingData(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "",
      address: "",
      city: "",
      province: "Ontario",
      postal_code: "",
      property_type: "Residential",
      listing_type: "Sale",
      price: "",
      bedrooms: "",
      bathrooms: "",
      square_feet: "",
      description: "",
      mls_number: "",
      status: "Active",
      assigned_agent_id: "",
      is_active: true,
      thumbnail_url: "",
      gallery_urls: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (prop: Property) => {
    setEditing(prop);
    setForm({
      title: prop.title,
      address: prop.address,
      city: prop.city || "",
      province: prop.province || "Ontario",
      postal_code: prop.postal_code || "",
      property_type: prop.property_type,
      listing_type: prop.listing_type,
      price: prop.price?.toString() || "",
      bedrooms: prop.bedrooms?.toString() || "",
      bathrooms: prop.bathrooms?.toString() || "",
      square_feet: prop.square_feet?.toString() || "",
      description: prop.description || "",
      mls_number: prop.mls_number || "",
      status: prop.status,
      assigned_agent_id: prop.assigned_agent_id || "",
      is_active: prop.is_active,
      thumbnail_url: prop.thumbnail_url || "",
      gallery_urls: prop.gallery_urls || [],
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "thumbnail" | "gallery") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempId = editing?.id || "new-" + Date.now();
    const url = await uploadImage(file, tempId);
    if (url) {
      if (type === "thumbnail") {
        setForm({ ...form, thumbnail_url: url });
      } else {
        setForm({ ...form, gallery_urls: [...form.gallery_urls, url] });
      }
      toast({ title: "Image uploaded" });
    } else {
      toast({ variant: "destructive", title: "Upload failed" });
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.address.trim()) {
      toast({ variant: "destructive", title: "Title and address are required" });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      address: form.address.trim(),
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      postal_code: form.postal_code.trim() || null,
      property_type: form.property_type,
      listing_type: form.listing_type,
      price: form.price ? parseFloat(form.price) : null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
      square_feet: form.square_feet ? parseInt(form.square_feet) : null,
      description: form.description.trim() || null,
      mls_number: form.mls_number.trim() || null,
      status: form.status,
      assigned_agent_id: form.assigned_agent_id || null,
      is_active: form.is_active,
      thumbnail_url: form.thumbnail_url || null,
      gallery_urls: form.gallery_urls,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("properties").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else { toast({ title: "Property updated" }); setDialogOpen(false); fetchData(); }
    } else {
      const { error } = await supabase.from("properties").insert({ ...payload, created_by: user!.id });
      if (error) toast({ variant: "destructive", title: error.message });
      else { toast({ title: "Property created" }); setDialogOpen(false); fetchData(); }
    }
    setSaving(false);
  };

  const deleteProperty = async (id: string) => {
    if (!confirm("Delete this property listing?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "Deleted" }); fetchData(); }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "—";
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(price);
  };

  const getAgentName = (id: string | null) => {
    if (!id) return "Unassigned";
    return agents.find((a) => a.id === id)?.full_name || "Unknown";
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
          <h1 className="font-display text-xl font-semibold">Property Management</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Properties
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Manage property listings visible to agents</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Property</Button>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : properties.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No properties yet.</p>
            <Button onClick={openNew} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Add First Property</Button>
          </CardContent></Card>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((prop) => (
                  <TableRow key={prop.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {prop.thumbnail_url ? (
                          <img src={prop.thumbnail_url} alt="" className="h-10 w-14 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{prop.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{prop.address}{prop.city ? `, ${prop.city}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{prop.property_type}</Badge></TableCell>
                    <TableCell className="font-medium">{formatPrice(prop.price)}</TableCell>
                    <TableCell>
                      <Badge variant={prop.status === "Active" ? "default" : prop.status === "Sold" ? "secondary" : "outline"} className="text-xs">
                        {prop.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getAgentName(prop.assigned_agent_id)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(prop)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteProperty(prop.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Property Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Property" : "Add Property"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Stunning 3BR Detached in Oakville" />
              </div>
              <div className="col-span-2">
                <Label>Address *</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Toronto" />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="M5V 1A1" />
              </div>
              <div>
                <Label>Property Type</Label>
                <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Listing Type</Label>
                <Select value={form.listing_type} onValueChange={(v) => setForm({ ...form, listing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LISTING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price ($)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="599000" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bedrooms</Label>
                <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} placeholder="3" />
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Input type="number" step="0.5" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} placeholder="2.5" />
              </div>
              <div>
                <Label>Square Feet</Label>
                <Input type="number" value={form.square_feet} onChange={(e) => setForm({ ...form, square_feet: e.target.value })} placeholder="2200" />
              </div>
              <div>
                <Label>MLS Number</Label>
                <Input value={form.mls_number} onChange={(e) => setForm({ ...form, mls_number: e.target.value })} placeholder="W1234567" />
              </div>
              <div className="col-span-2">
                <Label>Assigned Agent</Label>
                <Select value={form.assigned_agent_id} onValueChange={(v) => setForm({ ...form, assigned_agent_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select agent (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name || a.reco_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Property description..." rows={3} />
              </div>
            </div>

            {/* Image uploads */}
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label>Thumbnail Image</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form.thumbnail_url && <img src={form.thumbnail_url} alt="" className="h-16 w-24 rounded object-cover" />}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                      <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload"}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "thumbnail")} disabled={uploading} />
                  </label>
                </div>
              </div>
              <div>
                <Label>Gallery Images</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {form.gallery_urls.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="h-16 w-24 rounded object-cover" />
                      <button
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        onClick={() => setForm({ ...form, gallery_urls: form.gallery_urls.filter((_, idx) => idx !== i) })}
                      >×</button>
                    </div>
                  ))}
                  <label className="cursor-pointer">
                    <div className="h-16 w-24 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground hover:bg-muted">
                      <Plus className="h-5 w-5" />
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "gallery")} disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active (visible to agents)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
