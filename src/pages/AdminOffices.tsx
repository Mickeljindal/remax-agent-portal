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
import { ArrowLeft, Loader2, Building2, Plus, Trash2, Save, Mail, Pencil, DoorOpen, Video } from "lucide-react";
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

interface Room {
  id: string;
  location_id: string;
  name: string;
  capacity: number | null;
  amenities: string | null;
  is_virtual: boolean;
  is_active: boolean;
}

const blankForm = { name: "", address: "", phone: "", notification_email: "" };
const blankRoomForm = { name: "", capacity: "", amenities: "", is_virtual: false };

export default function AdminOffices() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [offices, setOffices] = useState<Office[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editing, setEditing] = useState<Office | null>(null);
  const [form, setForm] = useState(blankForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Room management state
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomOfficeId, setRoomOfficeId] = useState<string>("");
  const [roomForm, setRoomForm] = useState(blankRoomForm);
  const [savingRoom, setSavingRoom] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const load = async () => {
    setLoadingData(true);
    const [officeRes, roomRes] = await Promise.all([
      supabase.from("office_locations").select("*").order("sort_order"),
      supabase.from("meeting_rooms").select("*").order("name"),
    ]);
    setOffices((officeRes.data as Office[]) || []);
    setRooms((roomRes.data as Room[]) || []);
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

  // ─── Meeting rooms ───
  const openNewRoom = (officeId: string) => {
    setEditingRoom(null);
    setRoomOfficeId(officeId);
    setRoomForm(blankRoomForm);
    setRoomDialogOpen(true);
  };

  const openEditRoom = (r: Room) => {
    setEditingRoom(r);
    setRoomOfficeId(r.location_id);
    setRoomForm({
      name: r.name,
      capacity: r.capacity?.toString() || "",
      amenities: r.amenities || "",
      is_virtual: r.is_virtual,
    });
    setRoomDialogOpen(true);
  };

  const saveRoom = async () => {
    if (!roomForm.name.trim()) { toast({ variant: "destructive", title: "Enter a room name" }); return; }
    setSavingRoom(true);
    const payload = {
      name: roomForm.name.trim(),
      capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
      amenities: roomForm.amenities.trim() || null,
      is_virtual: roomForm.is_virtual,
    };
    if (editingRoom) {
      const { error } = await supabase.from("meeting_rooms").update(payload).eq("id", editingRoom.id);
      setSavingRoom(false);
      if (error) { toast({ variant: "destructive", title: error.message }); return; }
    } else {
      const { error } = await supabase.from("meeting_rooms").insert({ ...payload, location_id: roomOfficeId, is_active: true });
      setSavingRoom(false);
      if (error) { toast({ variant: "destructive", title: error.message }); return; }
    }
    setRoomDialogOpen(false);
    load();
    toast({ title: editingRoom ? "Room updated" : "Room added" });
  };

  const toggleRoomActive = async (r: Room) => {
    const { error } = await supabase.from("meeting_rooms").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else setRooms((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const removeRoom = async (r: Room) => {
    if (!confirm(`Delete room "${r.name}"? Existing bookings for it will also be removed.`)) return;
    const { error } = await supabase.from("meeting_rooms").delete().eq("id", r.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { load(); toast({ title: "Room removed" }); }
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
            Manage office locations, their bookable meeting rooms, and who receives room-booking inquiries for each
            office. Each booking emails its office's notification address (e.g. Mississauga → Shizu, Brampton → front desk).
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
                <CardContent className="py-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
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
                  </div>

                  {/* Meeting rooms for this office */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meeting rooms</p>
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => openNewRoom(o.id)}>
                        <Plus className="h-3 w-3" /> Add room
                      </Button>
                    </div>
                    {rooms.filter((r) => r.location_id === o.id).length === 0 ? (
                      <p className="py-1 text-xs text-muted-foreground">No rooms yet. Add a boardroom or meeting room agents can book.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {rooms.filter((r) => r.location_id === o.id).map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {r.is_virtual ? <Video className="h-4 w-4 shrink-0 text-[#1a4d8f]" /> : <DoorOpen className="h-4 w-4 shrink-0 text-[#e2231a]" />}
                              <div className="min-w-0">
                                <p className={`truncate text-sm font-medium ${!r.is_active ? "text-muted-foreground line-through" : ""}`}>{r.name}</p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {r.capacity ? `Seats ${r.capacity}` : "No capacity set"}{r.amenities ? ` · ${r.amenities}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Switch checked={r.is_active} onCheckedChange={() => toggleRoomActive(r)} />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRoom(r)} aria-label="Edit room">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeRoom(r)} aria-label="Delete room">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

      {/* Room add/edit dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingRoom ? "Edit room" : "Add room"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Room name *</Label>
              <Input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. Boardroom A" />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <Label>Amenities</Label>
              <Input
                value={roomForm.amenities}
                onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
                placeholder="e.g. Projector · VC · Whiteboard"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={roomForm.is_virtual} onCheckedChange={(v) => setRoomForm({ ...roomForm, is_virtual: v })} />
              <Label>Virtual room (Zoom / Teams link, not a physical room)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveRoom} disabled={savingRoom} className="gap-1.5">
              {savingRoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
