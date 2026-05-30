import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  GraduationCap,
  Users,
  Clock,
  Award,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface Agent {
  id: string;
  full_name: string | null;
  reco_number: string;
  avatar_url: string | null;
  email: string | null;
}

interface Course {
  id: string;
  title: string;
  category: string;
  is_mandatory: boolean;
}

interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  duration_minutes: number | null;
}

interface ProgressRecord {
  agent_id: string;
  module_id: string;
  completed: boolean;
  completed_at: string | null;
  watched_seconds: number;
}

interface Certificate {
  id: string;
  agent_id: string;
  course_id: string;
  issued_at: string;
  agent_name: string;
  course_title: string;
  total_watch_time_seconds: number;
}

interface AgentCourseStats {
  agent: Agent;
  totalCourses: number;
  completedCourses: number;
  totalWatchTimeSeconds: number;
  completionRate: number;
  lastActivity: string | null;
}

interface CourseStats {
  course: Course;
  totalModules: number;
  enrolledAgents: number;
  completedAgents: number;
  avgCompletionRate: number;
  totalWatchTime: number;
}

export default function AdminCourseAnalytics() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

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
    const [agentsRes, coursesRes, modulesRes, progressRes, certsRes] = await Promise.all([
      supabase.from("agents").select("id, full_name, reco_number, avatar_url, email").eq("is_active", true),
      supabase.from("courses").select("id, title, category, is_mandatory").eq("is_active", true),
      supabase.from("course_modules").select("id, course_id, title, duration_minutes").eq("is_active", true),
      supabase.from("course_progress").select("agent_id, module_id, completed, completed_at, watched_seconds"),
      supabase.from("course_certificates").select("*"),
    ]);

    setAgents((agentsRes.data as Agent[]) || []);
    setCourses((coursesRes.data as Course[]) || []);
    setModules((modulesRes.data as CourseModule[]) || []);
    setProgress((progressRes.data as ProgressRecord[]) || []);
    setCertificates((certsRes.data as Certificate[]) || []);
    setLoadingData(false);
  };

  // ─── Computed Stats ────────────────────────────────────────────
  const getAgentCourseStats = (): AgentCourseStats[] => {
    return agents.map((agent) => {
      const agentProgress = progress.filter((p) => p.agent_id === agent.id);
      const agentWatchTime = agentProgress.reduce((sum, p) => sum + (p.watched_seconds || 0), 0);

      // Calculate per-course completion
      let completedCourses = 0;
      courses.forEach((course) => {
        const courseModuleIds = modules.filter((m) => m.course_id === course.id).map((m) => m.id);
        if (courseModuleIds.length === 0) return;
        const completedModules = courseModuleIds.filter((mid) =>
          agentProgress.some((p) => p.module_id === mid && p.completed)
        ).length;
        if (completedModules === courseModuleIds.length) completedCourses++;
      });

      const lastCompleted = agentProgress
        .filter((p) => p.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];

      return {
        agent,
        totalCourses: courses.length,
        completedCourses,
        totalWatchTimeSeconds: agentWatchTime,
        completionRate: courses.length > 0 ? Math.round((completedCourses / courses.length) * 100) : 0,
        lastActivity: lastCompleted?.completed_at || null,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);
  };

  const getCourseStats = (): CourseStats[] => {
    return courses.map((course) => {
      const courseModuleIds = modules.filter((m) => m.course_id === course.id).map((m) => m.id);
      const totalModules = courseModuleIds.length;

      // Find agents who have any progress on this course
      const agentIdsWithProgress = new Set(
        progress.filter((p) => courseModuleIds.includes(p.module_id)).map((p) => p.agent_id)
      );

      // Find agents who completed all modules
      let completedAgents = 0;
      agentIdsWithProgress.forEach((agentId) => {
        const agentCourseProgress = progress.filter(
          (p) => p.agent_id === agentId && courseModuleIds.includes(p.module_id)
        );
        const completedCount = agentCourseProgress.filter((p) => p.completed).length;
        if (completedCount === totalModules && totalModules > 0) completedAgents++;
      });

      const totalWatchTime = progress
        .filter((p) => courseModuleIds.includes(p.module_id))
        .reduce((sum, p) => sum + (p.watched_seconds || 0), 0);

      const avgCompletionRate =
        agentIdsWithProgress.size > 0 && totalModules > 0
          ? Math.round(
              (Array.from(agentIdsWithProgress).reduce((sum, agentId) => {
                const completed = progress.filter(
                  (p) => p.agent_id === agentId && courseModuleIds.includes(p.module_id) && p.completed
                ).length;
                return sum + (completed / totalModules) * 100;
              }, 0) / agentIdsWithProgress.size)
            )
          : 0;

      return {
        course,
        totalModules,
        enrolledAgents: agentIdsWithProgress.size,
        completedAgents,
        avgCompletionRate,
        totalWatchTime,
      };
    }).sort((a, b) => b.enrolledAgents - a.enrolledAgents);
  };

  const formatWatchTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "AG";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const agentStats = getAgentCourseStats();
  const courseStats = getCourseStats();
  const totalCompletions = certificates.length;
  const totalWatchTime = progress.reduce((sum, p) => sum + (p.watched_seconds || 0), 0);
  const avgCompletion = agentStats.length > 0
    ? Math.round(agentStats.reduce((sum, s) => sum + s.completionRate, 0) / agentStats.length)
    : 0;

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
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={remaxLogo} alt="" className="h-10 w-auto brightness-0 invert object-contain" />
          </div>
          <h1 className="font-display text-xl font-semibold">Course Analytics</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Courses</p>
                      <p className="text-3xl font-bold">{courses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Award className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Certificates Issued</p>
                      <p className="text-3xl font-bold">{totalCompletions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Watch Time</p>
                      <p className="text-3xl font-bold">{formatWatchTime(totalWatchTime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Completion</p>
                      <p className="text-3xl font-bold">{avgCompletion}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="agents">
              <TabsList>
                <TabsTrigger value="agents" className="gap-2">
                  <Users className="h-4 w-4" /> Per Agent
                </TabsTrigger>
                <TabsTrigger value="courses" className="gap-2">
                  <BarChart3 className="h-4 w-4" /> Per Course
                </TabsTrigger>
                <TabsTrigger value="certificates" className="gap-2">
                  <Award className="h-4 w-4" /> Certificates
                </TabsTrigger>
              </TabsList>

              {/* Per Agent Tab */}
              <TabsContent value="agents">
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Training Progress</CardTitle>
                    <CardDescription>Course completion and watch time per agent</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {agentStats.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No agents found.</p>
                    ) : (
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Agent</TableHead>
                              <TableHead className="text-center">Courses Done</TableHead>
                              <TableHead className="text-center">Completion</TableHead>
                              <TableHead className="text-center">Watch Time</TableHead>
                              <TableHead>Last Activity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agentStats.map((stat) => (
                              <TableRow key={stat.agent.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarImage src={stat.agent.avatar_url || undefined} />
                                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                        {getInitials(stat.agent.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-sm">{stat.agent.full_name || "Unnamed"}</p>
                                      <p className="text-xs text-muted-foreground">{stat.agent.reco_number}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="font-semibold">{stat.completedCourses}</span>
                                  <span className="text-muted-foreground">/{stat.totalCourses}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={stat.completionRate} className="h-2 flex-1" />
                                    <span className="text-xs font-medium w-10 text-right">{stat.completionRate}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {formatWatchTime(stat.totalWatchTimeSeconds)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {stat.lastActivity
                                    ? format(new Date(stat.lastActivity), "MMM d, yyyy")
                                    : "Never"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Per Course Tab */}
              <TabsContent value="courses">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Performance</CardTitle>
                    <CardDescription>Enrollment and completion stats per course</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {courseStats.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No courses found.</p>
                    ) : (
                      <div className="space-y-4">
                        {courseStats.map((stat) => (
                          <div key={stat.course.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{stat.course.title}</h3>
                                  <Badge variant="outline" className="text-xs">{stat.course.category}</Badge>
                                  {stat.course.is_mandatory && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-0.5" /> Required
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {stat.totalModules} modules · {formatWatchTime(stat.totalWatchTime)} total watch time
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold">{stat.avgCompletionRate}%</p>
                                <p className="text-xs text-muted-foreground">avg completion</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="bg-muted/50 rounded-lg p-2">
                                <p className="text-lg font-semibold">{stat.enrolledAgents}</p>
                                <p className="text-xs text-muted-foreground">Enrolled</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2">
                                <p className="text-lg font-semibold text-green-600">{stat.completedAgents}</p>
                                <p className="text-xs text-muted-foreground">Completed</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2">
                                <p className="text-lg font-semibold text-amber-600">
                                  {stat.enrolledAgents - stat.completedAgents}
                                </p>
                                <p className="text-xs text-muted-foreground">In Progress</p>
                              </div>
                            </div>
                            <Progress value={stat.avgCompletionRate} className="h-2 mt-3" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Certificates Tab */}
              <TabsContent value="certificates">
                <Card>
                  <CardHeader>
                    <CardTitle>Issued Certificates</CardTitle>
                    <CardDescription>All course completion certificates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {certificates.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        No certificates issued yet. Certificates are generated when agents complete all modules in a course.
                      </p>
                    ) : (
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Agent</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Watch Time</TableHead>
                              <TableHead>Issued</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {certificates.map((cert) => (
                              <TableRow key={cert.id}>
                                <TableCell className="font-medium">{cert.agent_name}</TableCell>
                                <TableCell>{cert.course_title}</TableCell>
                                <TableCell>{formatWatchTime(cert.total_watch_time_seconds)}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(cert.issued_at), "MMM d, yyyy")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
