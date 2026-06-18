import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail, Save, Bell, Users, GraduationCap, CalendarCheck, FileText, MessageSquare, Megaphone } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

// All notification use-cases with admin-controllable toggles.
interface NotificationRules {
  // ─── Sender / Routing ───
  from_email: string;
  portal_name: string;
  worksheet_admin_email: string;
  worksheet_from_email: string;
  support_inbox_email: string;

  // ─── Agent Notifications ───
  agent_booking_confirmation: boolean;   // Email agent when they book a room
  agent_course_assigned: boolean;        // Email agent when a course is assigned
  agent_course_completed: boolean;       // Email agent on course completion (certificate)
  agent_course_reminder: boolean;        // Email agent reminder for incomplete courses
  agent_account_activated: boolean;      // Email agent when admin activates their account
  agent_support_reply: boolean;          // Email agent when admin replies to their ticket
  agent_event_reminder: boolean;         // Email agent about upcoming events/reminders

  // ─── Admin Notifications ───
  admin_new_signup: boolean;             // Email admins when a new agent registers
  admin_course_completed: boolean;       // Email admins when an agent finishes a course
  admin_worksheet_submitted: boolean;    // Email admin when worksheet is submitted
  admin_booking_notify: boolean;         // Email office on room booking
  admin_support_ticket: boolean;         // Email admins on new support ticket

  // ─── Broadcast to All Agents ───
  broadcast_new_course: boolean;         // Email all agents when a new course is published
  broadcast_new_listing: boolean;        // Email all agents when a new listing is added
  broadcast_new_event: boolean;          // Email all agents when a new event is created

  // ─── Reminders / Frequency ───
  booking_reminder_enabled: boolean;     // Send reminders before meetings
  booking_reminder_hours: string;        // Comma-separated hours before (e.g. "24,1")
  course_incomplete_days: number;        // Days after last activity to nudge agent
}

const DEFAULTS: NotificationRules = {
  from_email: "noreply@agents.updates.joinremaxex.com",
  portal_name: "RE/MAX Excellence Portal",
  worksheet_admin_email: "",
  worksheet_from_email: "noreply@agents.updates.joinremaxex.com",
  support_inbox_email: "shizu@remaxex.com",

  agent_booking_confirmation: true,
  agent_course_assigned: true,
  agent_course_completed: true,
  agent_course_reminder: true,
  agent_account_activated: true,
  agent_support_reply: true,
  agent_event_reminder: true,

  admin_new_signup: true,
  admin_course_completed: true,
  admin_worksheet_submitted: true,
  admin_booking_notify: true,
  admin_support_ticket: true,

  broadcast_new_course: false,
  broadcast_new_listing: false,
  broadcast_new_event: false,

  booking_reminder_enabled: true,
  booking_reminder_hours: "24,1",
  course_incomplete_days: 7,
};

const KEY = "email_settings";

function ToggleRow({ label, description, checked, onChange, icon }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>}
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

export default function AdminEmailSettings() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [form, setForm] = useState<NotificationRules>(DEFAULTS);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => { if (isAdmin) loadSettings(); }, [isAdmin]);

  const loadSettings = async () => {
    setLoadingData(true);
    const { data } = await supabase.from("portal_settings").select("value").eq("key", KEY).maybeSingle();
    if (data?.value) {
      const v = data.value as Partial<NotificationRules>;
      setForm({ ...DEFAULTS, ...v });
    }
    setLoadingData(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("portal_settings").upsert(
      { key: KEY, value: form as unknown as Record<string, unknown>, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: "Notification settings saved", description: "Changes take effect within 60 seconds." });
  };

  const set = <K extends keyof NotificationRules>(key: K, value: NotificationRules[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (loading || (!isAdmin && user) || loadingData) {
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
          <h1 className="font-display text-xl font-semibold">Email & Notifications</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* ─── Sender Config ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Sender Configuration</CardTitle>
            <CardDescription>The "From" address and portal name used in all outbound emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Portal name</Label>
                <Input value={form.portal_name} onChange={(e) => set("portal_name", e.target.value)} placeholder="RE/MAX Excellence Portal" className="mt-1" />
              </div>
              <div>
                <Label>Sender email</Label>
                <Input type="email" value={form.from_email} onChange={(e) => set("from_email", e.target.value)} placeholder="noreply@agents.updates.joinremaxex.com" className="mt-1" />
                <p className="mt-1 text-[11px] text-muted-foreground">Must be on your verified Resend domain.</p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Worksheet admin recipient</Label>
                <Input type="email" value={form.worksheet_admin_email} onChange={(e) => set("worksheet_admin_email", e.target.value)} placeholder="admin@remaxex.com" className="mt-1" />
              </div>
              <div>
                <Label>Worksheet sender</Label>
                <Input type="email" value={form.worksheet_from_email} onChange={(e) => set("worksheet_from_email", e.target.value)} placeholder="noreply@..." className="mt-1" />
              </div>
            </div>
            <Separator />
            <div>
              <Label>Support ticket inbox</Label>
              <Input type="email" value={form.support_inbox_email} onChange={(e) => set("support_inbox_email", e.target.value)} placeholder="shizu@remaxex.com" className="mt-1" />
              <p className="mt-1 text-[11px] text-muted-foreground">New support tickets opened by agents are emailed here.</p>
            </div>
          </CardContent>
        </Card>

        {/* ─── Agent Notifications ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#1a4d8f]" /> Agent Email Notifications</CardTitle>
            <CardDescription>Emails sent directly to individual agents based on actions in the portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow icon={<CalendarCheck className="h-4 w-4" />} label="Booking confirmation" description="Agent receives an email confirming their room booking" checked={form.agent_booking_confirmation} onChange={(v) => set("agent_booking_confirmation", v)} />
            <ToggleRow icon={<GraduationCap className="h-4 w-4" />} label="Course assigned" description="Agent is notified when a course is assigned to them" checked={form.agent_course_assigned} onChange={(v) => set("agent_course_assigned", v)} />
            <ToggleRow icon={<GraduationCap className="h-4 w-4" />} label="Course completed (certificate)" description="Agent receives their completion certificate via email" checked={form.agent_course_completed} onChange={(v) => set("agent_course_completed", v)} />
            <ToggleRow icon={<Bell className="h-4 w-4" />} label="Course reminder (incomplete)" description="Nudge agents who started but haven't finished a course" checked={form.agent_course_reminder} onChange={(v) => set("agent_course_reminder", v)} />
            <ToggleRow icon={<Users className="h-4 w-4" />} label="Account activated" description="Welcome email when admin approves their account" checked={form.agent_account_activated} onChange={(v) => set("agent_account_activated", v)} />
            <ToggleRow icon={<MessageSquare className="h-4 w-4" />} label="Support ticket reply" description="Agent notified when admin replies to their support ticket" checked={form.agent_support_reply} onChange={(v) => set("agent_support_reply", v)} />
            <ToggleRow icon={<Bell className="h-4 w-4" />} label="Event & reminder notifications" description="Agent emailed about upcoming events and admin-set reminders" checked={form.agent_event_reminder} onChange={(v) => set("agent_event_reminder", v)} />
          </CardContent>
        </Card>

        {/* ─── Admin Notifications ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-[#e2231a]" /> Admin Notifications</CardTitle>
            <CardDescription>Emails sent to admin(s) when agents take actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow icon={<Users className="h-4 w-4" />} label="New agent signup" description="Admins notified when a new agent registers (pending activation)" checked={form.admin_new_signup} onChange={(v) => set("admin_new_signup", v)} />
            <ToggleRow icon={<GraduationCap className="h-4 w-4" />} label="Agent completed course" description="Admin email when an agent finishes a course" checked={form.admin_course_completed} onChange={(v) => set("admin_course_completed", v)} />
            <ToggleRow icon={<FileText className="h-4 w-4" />} label="Worksheet submitted" description="Admin email when an agent submits a pre-con worksheet" checked={form.admin_worksheet_submitted} onChange={(v) => set("admin_worksheet_submitted", v)} />
            <ToggleRow icon={<CalendarCheck className="h-4 w-4" />} label="Room booking made" description="Office email when an agent books a room (per-office address)" checked={form.admin_booking_notify} onChange={(v) => set("admin_booking_notify", v)} />
            <ToggleRow icon={<MessageSquare className="h-4 w-4" />} label="New support ticket" description="Admins emailed when an agent opens a new support ticket" checked={form.admin_support_ticket} onChange={(v) => set("admin_support_ticket", v)} />
          </CardContent>
        </Card>

        {/* ─── Broadcast (All Agents) ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-amber-600" /> Broadcast to All Agents</CardTitle>
            <CardDescription>Mass emails sent to every active agent when new content is published. Use carefully.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow icon={<GraduationCap className="h-4 w-4" />} label="New course published" description="Email all agents when a new training course goes live" checked={form.broadcast_new_course} onChange={(v) => set("broadcast_new_course", v)} />
            <ToggleRow icon={<FileText className="h-4 w-4" />} label="New listing added" description="Email all agents when a new pre-construction listing is published" checked={form.broadcast_new_listing} onChange={(v) => set("broadcast_new_listing", v)} />
            <ToggleRow icon={<Bell className="h-4 w-4" />} label="New event created" description="Email all agents when a new event or announcement is posted" checked={form.broadcast_new_event} onChange={(v) => set("broadcast_new_event", v)} />
          </CardContent>
        </Card>

        {/* ─── Reminder Frequency ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-emerald-600" /> Reminder Frequency</CardTitle>
            <CardDescription>Control when automatic reminder emails are sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow icon={<CalendarCheck className="h-4 w-4" />} label="Meeting booking reminders" description="Send email reminders before scheduled room bookings" checked={form.booking_reminder_enabled} onChange={(v) => set("booking_reminder_enabled", v)} />
            {form.booking_reminder_enabled && (
              <div className="ml-7">
                <Label>Hours before meeting to send reminders</Label>
                <Input
                  value={form.booking_reminder_hours}
                  onChange={(e) => set("booking_reminder_hours", e.target.value)}
                  placeholder="24,1"
                  className="mt-1 max-w-[200px]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Comma-separated values. E.g. "24,1" = reminder 24 hours and 1 hour before the meeting.
                </p>
              </div>
            )}

            <Separator />

            <div>
              <Label>Course incomplete nudge (days)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={form.course_incomplete_days}
                onChange={(e) => set("course_incomplete_days", parseInt(e.target.value) || 7)}
                className="mt-1 max-w-[140px]"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                After this many days of inactivity on a started course, send the agent a reminder to complete it. Set to 0 to disable.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ─── Office Booking Emails ─── */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Per-office booking emails</strong> are managed separately in{" "}
          <button className="underline font-semibold text-primary" onClick={() => navigate("/admin/offices")}>
            Offices &amp; booking emails
          </button>
          . Each office has its own notification address (e.g. Mississauga → Shizu, Brampton → front desk).
        </div>

        {/* ─── Save ─── */}
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save all notification settings
          </Button>
        </div>
      </main>
    </div>
  );
}
