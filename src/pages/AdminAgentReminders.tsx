import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Loader2, Plus } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface AgentRow {
  id: string;
  full_name: string | null;
  reco_number: string;
}

export default function AdminAgentReminders() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [rows, setRows] = useState<
    { id: string; agent_id: string; title: string; body: string | null; remind_at: string; entity_type: string; dismissed: boolean }[]
  >([]);
  const [busy, setBusy] = useState(true);
  const [agentId, setAgentId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [entityType, setEntityType] = useState("general");
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
    const [a, r] = await Promise.all([
      supabase.from("agents").select("id, full_name, reco_number").eq("is_active", true).order("full_name"),
      supabase.from("agent_reminders").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setAgents((a.data as AgentRow[]) || []);
    setRows((r.data as typeof rows) || []);
    setBusy(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const createReminder = async () => {
    if (!user?.id || !agentId || !title.trim()) {
      toast({ variant: "destructive", title: "Agent and title are required" });
      return;
    }
    setSaving(true);
    const remindAtIso = remindAt ? new Date(remindAt).toISOString() : new Date().toISOString();
    const { error } = await supabase.from("agent_reminders").insert({
      agent_id: agentId,
      title: title.trim(),
      body: body.trim() || null,
      remind_at: remindAtIso,
      entity_type: entityType,
      created_by: user.id,
    });
    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: error.message });
      return;
    }

    // Send in-app notification to the agent's bell
    await supabase.from("in_app_notifications").insert({
      agent_id: agentId,
      title: `Reminder: ${title.trim()}`,
      body: body.trim() || `Due ${new Date(remindAtIso).toLocaleString()}`,
      type: "reminder",
      link: "/dashboard",
    });

    // Email the agent (best-effort via edge function)
    const { data: agentData } = await supabase
      .from("agents")
      .select("email, full_name")
      .eq("id", agentId)
      .single();
    if (agentData?.email) {
      supabase.functions.invoke("send-notification", {
        body: {
          type: "course_reminder",
          recipientEmail: agentData.email,
          recipientName: agentData.full_name || "Agent",
          recipientAgentId: agentId,
          subject: `Reminder: ${title.trim()}`,
          body: `Hi ${agentData.full_name || "Agent"},\n\n${title.trim()}\n${body.trim() ? `\n${body.trim()}` : ""}\n\nDue: ${new Date(remindAtIso).toLocaleString()}\n\nLog in to the portal for details.`,
        },
      }).catch(() => {});
    }

    setSaving(false);
    toast({ title: "Reminder sent", description: "Agent notified in-app and by email." });
    setTitle("");
    setBody("");
    load();
  };

  const deleteRow = async (id: string) => {
    const { error } = await supabase.from("agent_reminders").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: "Deleted" });
      load();
    }
  };

  if (loading || (!isAdmin && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const agentName = (id: string) => agents.find((x) => x.id === id)?.full_name || id.slice(0, 8);

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
          <h1 className="font-display text-xl font-semibold">Agent reminders</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Add reminder for an agent
            </CardTitle>
            <CardDescription>Agents see these in the bell panel on their dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name || a.reco_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Related area</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="precon">Pre-construction</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finish pre-con module 2" />
            </div>
            <div className="md:col-span-2">
              <Label>Message</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Remind at</Label>
              <Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={createReminder} disabled={saving} className="gap-2">
                <Plus className="h-4 w-4" /> Create reminder
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent reminders (all agents)</CardTitle>
          </CardHeader>
          <CardContent>
            {busy ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dismissed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{agentName(r.agent_id)}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.entity_type}</TableCell>
                      <TableCell>{r.dismissed ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => deleteRow(r.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
