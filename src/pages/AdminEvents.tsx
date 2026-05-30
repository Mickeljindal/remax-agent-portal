import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
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
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Users,
  MapPin,
  Clock,
  Bell,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_type: string;
  location: string | null;
  is_active: boolean;
  max_attendees: number | null;
  notify_agents: boolean;
  reminder_hours_before: number | null;
  created_at: string;
}

interface RsvpCount {
  event_id: string;
  count: number;
}

const EVENT_TYPES = ["Meeting", "Training", "Social", "Open House", "Webinar", "Workshop", "Other"];

export default function AdminEvents() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { sendNotification } = useNotifications();
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    end_date: "",
    event_type: "Meeting",
    location: "",
    is_active: true,
    max_attendees: "",
    notify_agents: true,
    reminder_hours_before: "24",
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
    const [eventsRes, rsvpsRes] = await Promise.all([
      supabase.from("events").select("*").order("event_date", { ascending: false }),
      supabase.from("event_rsvps").select("event_id"),
    ]);

    setEvents((eventsRes.data as Event[]) || []);

    // Count RSVPs per event
    const counts: Record<string, number> = {};
    (rsvpsRes.data || []).forEach((r: { event_id: string }) => {
      counts[r.event_id] = (counts[r.event_id] || 0) + 1;
    });
    setRsvpCounts(counts);
    setLoadingData(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      event_date: "",
      end_date: "",
      event_type: "Meeting",
      location: "",
      is_active: true,
      max_attendees: "",
      notify_agents: true,
      reminder_hours_before: "24",
    });
    setDialogOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date ? event.event_date.slice(0, 16) : "",
      end_date: event.end_date ? event.end_date.slice(0, 16) : "",
      event_type: event.event_type,
      location: event.location || "",
      is_active: event.is_active,
      max_attendees: event.max_attendees?.toString() || "",
      notify_agents: event.notify_agents ?? true,
      reminder_hours_before: event.reminder_hours_before?.toString() || "24",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.event_date) {
      toast({ variant: "destructive", title: "Title and date are required" });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_date: new Date(form.event_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      event_type: form.event_type,
      location: form.location.trim() || null,
      is_active: form.is_active,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      notify_agents: form.notify_agents,
      reminder_hours_before: form.reminder_hours_before ? parseInt(form.reminder_hours_before) : 24,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else { toast({ title: "Event updated" }); setDialogOpen(false); fetchData(); }
    } else {
      const { error } = await supabase.from("events").insert({ ...payload, created_by: user!.id });
      if (error) toast({ variant: "destructive", title: error.message });
      else {
        toast({ title: "Event created" });
        setDialogOpen(false);
        fetchData();

        // Notify all agents about new event if enabled
        if (form.notify_agents) {
          notifyAllAgents(form.title, form.event_date, form.location);
        }
      }
    }
    setSaving(false);
  };

  const notifyAllAgents = async (eventTitle: string, eventDate: string, location: string) => {
    setNotifying(true);
    const { data: agentsData } = await supabase
      .from("agents")
      .select("id, email, full_name")
      .eq("is_active", true);

    const dateStr = new Date(eventDate).toLocaleDateString("en-CA", { dateStyle: "long" });
    const timeStr = new Date(eventDate).toLocaleTimeString("en-CA", { timeStyle: "short" });

    for (const agent of agentsData || []) {
      if (!agent.email) continue;

      // In-app notification
      await supabase.from("in_app_notifications").insert({
        agent_id: agent.id,
        title: `New Event: ${eventTitle}`,
        body: `${dateStr} at ${timeStr}${location ? ` — ${location}` : ""}`,
        type: "event",
        link: "/dashboard",
      });

      // Email notification
      sendNotification({
        type: "course_reminder", // reusing type for events
        recipientEmail: agent.email,
        recipientName: agent.full_name || "Agent",
        recipientAgentId: agent.id,
        subject: `New Event: ${eventTitle}`,
        body: `Hi ${agent.full_name || "Agent"},\n\nA new event has been scheduled:\n\n📅 ${eventTitle}\n🕐 ${dateStr} at ${timeStr}${location ? `\n📍 ${location}` : ""}\n\nLog in to the portal to RSVP.\n\nBest regards,\nRE/MAX Excellence Team`,
      });
    }
    setNotifying(false);
    toast({ title: "All agents notified" });
  };

  const sendReminder = async (event: Event) => {
    setNotifying(true);
    const { data: rsvps } = await supabase
      .from("event_rsvps")
      .select("agent_id")
      .eq("event_id", event.id);

    const agentIds = (rsvps || []).map((r) => r.agent_id);
    if (agentIds.length === 0) {
      toast({ title: "No RSVPs to remind" });
      setNotifying(false);
      return;
    }

    const { data: agentsData } = await supabase
      .from("agents")
      .select("id, email, full_name")
      .in("id", agentIds);

    const dateStr = new Date(event.event_date).toLocaleDateString("en-CA", { dateStyle: "long" });
    const timeStr = new Date(event.event_date).toLocaleTimeString("en-CA", { timeStyle: "short" });

    for (const agent of agentsData || []) {
      if (!agent.email) continue;
      await supabase.from("in_app_notifications").insert({
        agent_id: agent.id,
        title: `Reminder: ${event.title}`,
        body: `Coming up on ${dateStr} at ${timeStr}`,
        type: "event",
        link: "/dashboard",
      });

      sendNotification({
        type: "course_reminder",
        recipientEmail: agent.email,
        recipientName: agent.full_name || "Agent",
        recipientAgentId: agent.id,
        subject: `Reminder: ${event.title} is coming up`,
        body: `Hi ${agent.full_name || "Agent"},\n\nThis is a reminder about the upcoming event:\n\n📅 ${event.title}\n🕐 ${dateStr} at ${timeStr}${event.location ? `\n📍 ${event.location}` : ""}\n\nSee you there!\n\nBest regards,\nRE/MAX Excellence Team`,
      });
    }
    setNotifying(false);
    toast({ title: `Reminder sent to ${agentsData?.length || 0} agents` });
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("event_rsvps").delete().eq("event_id", id);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "Event deleted" }); fetchData(); }
  };

  const isPast = (date: string) => new Date(date) < new Date();

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
          <h1 className="font-display text-xl font-semibold">Events Management</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6 text-primary" /> Events</h2>
            <p className="text-sm text-muted-foreground mt-1">Create events, send notifications, track RSVPs</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New Event</Button>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No events yet.</p>
            <Button onClick={openNew} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Create Event</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <Card key={event.id} className={`${!event.is_active ? "opacity-60" : ""} ${isPast(event.event_date) ? "border-muted" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <Badge variant="outline" className="text-xs">{event.event_type}</Badge>
                        {isPast(event.event_date) && <Badge variant="secondary" className="text-xs">Past</Badge>}
                        {!event.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(event.event_date), "MMM d, yyyy 'at' h:mm a")}
                          {event.end_date && ` — ${format(new Date(event.end_date), "h:mm a")}`}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {rsvpCounts[event.id] || 0} RSVPs
                          {event.max_attendees && ` / ${event.max_attendees} max`}
                        </span>
                      </div>
                      {event.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      {!isPast(event.event_date) && (
                        <Button variant="outline" size="sm" onClick={() => sendReminder(event)} disabled={notifying} className="gap-1">
                          <Send className="h-3 w-3" /> Remind
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(event)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteEvent(event.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Event Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Monthly Team Meeting" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Event details..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date/Time *</Label>
                <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date/Time</Label>
                <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Attendees</Label>
                <Input type="number" value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: e.target.value })} placeholder="Unlimited" />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Office boardroom / Zoom link" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reminder (hours before)</Label>
                <Input type="number" value={form.reminder_hours_before} onChange={(e) => setForm({ ...form, reminder_hours_before: e.target.value })} placeholder="24" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.notify_agents} onCheckedChange={(v) => setForm({ ...form, notify_agents: v })} />
                <Label>Notify all agents on create</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
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
