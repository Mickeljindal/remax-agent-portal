import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
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
import { ArrowLeft, GraduationCap, Loader2, Plus } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface AgentRow {
  id: string;
  full_name: string | null;
  reco_number: string;
}
interface CourseRow {
  id: string;
  title: string;
}
interface AssignmentRow {
  id: string;
  course_id: string;
  agent_id: string;
  note: string | null;
  due_at: string | null;
  created_at: string;
}

export default function AdminCourseAssignments() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { notifyCourseAssigned } = useNotifications();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [agentId, setAgentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");
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
    const [a, c, r] = await Promise.all([
      supabase.from("agents").select("id, full_name, reco_number").eq("is_active", true).order("full_name"),
      supabase.from("courses").select("id, title").eq("is_active", true).order("title"),
      supabase.from("course_assignments").select("*").order("created_at", { ascending: false }),
    ]);
    setAgents((a.data as AgentRow[]) || []);
    setCourses((c.data as CourseRow[]) || []);
    setRows((r.data as AssignmentRow[]) || []);
    setBusy(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const assign = async () => {
    if (!user?.id || !agentId || !courseId) {
      toast({ variant: "destructive", title: "Pick an agent and a course" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("course_assignments").insert({
      agent_id: agentId,
      course_id: courseId,
      assigned_by: user.id,
      note: note.trim() || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        toast({ variant: "destructive", title: "Already assigned", description: "This agent already has this course." });
      } else {
        toast({ variant: "destructive", title: error.message });
      }
      return;
    }
    toast({ title: "Course assigned" });

    // Send email notification to the agent
    const assignedAgent = agents.find((a) => a.id === agentId);
    const assignedCourse = courses.find((c) => c.id === courseId);
    if (assignedAgent && assignedCourse) {
      // Get agent email
      const { data: agentData } = await supabase
        .from("agents")
        .select("email")
        .eq("id", agentId)
        .single();
      if (agentData?.email) {
        notifyCourseAssigned(
          agentData.email,
          assignedAgent.full_name || "Agent",
          agentId,
          assignedCourse.title,
          dueAt || undefined
        );
      }
    }

    setNote("");
    setDueAt("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("course_assignments").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: "Removed" });
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
  const courseTitle = (id: string) => courses.find((x) => x.id === id)?.title || id.slice(0, 8);

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
          <h1 className="font-display text-xl font-semibold">Course assignments</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Assign a course to an agent
            </CardTitle>
            <CardDescription>Assigned courses show an &quot;Assigned&quot; badge on the agent dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name || a.reco_number} · {a.reco_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due (optional)</Label>
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Instructions for the agent…" rows={2} />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <Button onClick={assign} disabled={saving} className="gap-2">
                <Plus className="h-4 w-4" /> Assign course
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {busy ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{agentName(r.agent_id)}</TableCell>
                      <TableCell>{courseTitle(r.course_id)}</TableCell>
                      <TableCell>{r.due_at ? new Date(r.due_at).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => remove(r.id)}>
                          Remove
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
