import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PORTAL_SHOWCASE } from "@/config/portalShowcase";
import TrainingCoursesShowcase from "@/components/dashboard/TrainingCoursesShowcase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GraduationCap,
  PlayCircle,
  FileQuestion,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
} from "lucide-react";
import { useTrainingCoursesData, type Course } from "@/hooks/useTrainingCoursesData";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "@/hooks/use-toast";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import CertificateShareActions from "@/components/dashboard/CertificateShareActions";
import VideoPlayer from "@/components/dashboard/VideoPlayer";

interface TrainingCoursesProps {
  agentId: string | undefined;
  agentName?: string | null;
  recoNumber?: string | null;
}

export default function TrainingCourses({ agentId, agentName, recoNumber }: TrainingCoursesProps) {
  if (PORTAL_SHOWCASE) {
    return <TrainingCoursesShowcase agentName={agentName} recoNumber={recoNumber} />;
  }

  const {
    courses,
    modules,
    progress,
    loading,
    refetch,
    getCourseProgress,
    getCourseModules,
    isModuleCompleted,
    setProgress,
  } = useTrainingCoursesData(agentId);

  const { notifyCourseCompleted } = useNotifications();

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [reminderFreq, setReminderFreq] = useState("weekly");
  const [certOpen, setCertOpen] = useState(false);
  const [assignedCourseIds, setAssignedCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      const { data } = await supabase.from("course_assignments").select("course_id").eq("agent_id", agentId);
      setAssignedCourseIds(new Set((data || []).map((r: { course_id: string }) => r.course_id)));
    })();
  }, [agentId]);

  const newCourses = courses.filter((c) => getCourseProgress(c.id) < 100);
  const completedCourses = courses.filter((c) => getCourseProgress(c.id) === 100);

  const markComplete = async (moduleId: string) => {
    if (!agentId) return;
    const existing = progress.find((p) => p.module_id === moduleId);
    if (existing) {
      await supabase
        .from("course_progress")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("agent_id", agentId)
        .eq("module_id", moduleId);
    } else {
      await supabase.from("course_progress").insert({
        agent_id: agentId,
        module_id: moduleId,
        completed: true,
        completed_at: new Date().toISOString(),
      });
    }
    setProgress((prev) => {
      const idx = prev.findIndex((p) => p.module_id === moduleId);
      if (idx >= 0) return prev.map((p, i) => (i === idx ? { ...p, completed: true } : p));
      return [...prev, { module_id: moduleId, completed: true, watched_seconds: 0, score: null }];
    });

    // Check if entire course is now complete
    if (selectedCourse) {
      const courseModules = getCourseModules(selectedCourse.id);
      const updatedProgress = [...progress];
      const existingIdx = updatedProgress.findIndex((p) => p.module_id === moduleId);
      if (existingIdx >= 0) updatedProgress[existingIdx] = { ...updatedProgress[existingIdx], completed: true };
      else updatedProgress.push({ module_id: moduleId, completed: true, watched_seconds: 0, score: null });

      const allDone = courseModules.every((m) =>
        updatedProgress.some((p) => p.module_id === m.id && p.completed)
      );

      if (allDone) {
        // Issue certificate
        const totalWatch = updatedProgress
          .filter((p) => courseModules.some((m) => m.id === p.module_id))
          .reduce((sum, p) => sum + (p.watched_seconds || 0), 0);

        const certNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${agentId.slice(0, 4).toUpperCase()}`;

        await supabase.from("course_certificates").upsert({
          agent_id: agentId,
          course_id: selectedCourse.id,
          certificate_number: certNumber,
          agent_name: agentName || "Agent",
          reco_number: recoNumber || "",
          course_title: selectedCourse.title,
          total_watch_time_seconds: totalWatch,
          issued_at: new Date().toISOString(),
        }, { onConflict: "agent_id,course_id" });

        // Send completion notification
        const { data: agentData } = await supabase
          .from("agents")
          .select("email")
          .eq("id", agentId)
          .single();

        if (agentData?.email) {
          notifyCourseCompleted(
            agentData.email,
            agentName || "Agent",
            agentId,
            selectedCourse.title,
            totalWatch
          );
        }

        toast({ title: "🎉 Course completed!", description: "Your certificate is ready." });
      }
    }

    refetch();
  };

  const pct = selectedCourse ? getCourseProgress(selectedCourse.id) : 0;
  const doneCert = pct === 100;

  const CourseCard = ({ course }: { course: Course }) => {
    const p = getCourseProgress(course.id);
    const modCount = getCourseModules(course.id).length;
    const completedCount = getCourseModules(course.id).filter((m) => isModuleCompleted(m.id)).length;
    const priceTag = course.category?.toLowerCase().includes("paid") ? "Paid" : "Free";

    return (
      <Card
        className="min-w-[260px] max-w-[280px] border-border hover:shadow-lg transition-all cursor-pointer group shrink-0 snap-start"
        onClick={() => {
          setSelectedCourse(course);
          // Auto-select first video module
          const firstVideoModule = getCourseModules(course.id).find((m) => m.video_url);
          setActiveModuleId(firstVideoModule?.id || null);
        }}
      >
        <div className="h-28 bg-gradient-to-br from-primary/80 to-primary rounded-t-lg flex items-center justify-center relative overflow-hidden">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <GraduationCap className="h-10 w-10 text-primary-foreground/60" />
          )}
          {(assignedCourseIds.has(course.id) || course.is_mandatory) && (
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
              {assignedCourseIds.has(course.id) && (
                <Badge className="bg-amber-500 text-[10px] text-amber-950 hover:bg-amber-500">Assigned</Badge>
              )}
              {course.is_mandatory && (
                <Badge className="bg-destructive text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-0.5" /> Required
                </Badge>
              )}
            </div>
          )}
          <Badge className="absolute bottom-2 left-2 bg-background/90 text-foreground text-[10px]">{priceTag}</Badge>
        </div>
        <CardContent className="pt-3 pb-4">
          <Badge variant="outline" className="text-[10px] mb-1">
            {course.category}
          </Badge>
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-accent">{course.title}</h3>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{course.description}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                {completedCount}/{modCount} modules
              </span>
              <span className="font-semibold text-foreground">{p}%</span>
            </div>
            <Progress value={p} className="h-1.5" />
          </div>
          <Button size="sm" className="w-full mt-3" variant={p > 0 ? "default" : "outline"}>
            {p > 0 ? "Continue" : "Enroll now"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-accent" />
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Training &amp; courses</h2>
          <p className="text-sm text-muted-foreground">Video modules, quizzes, and certificates</p>
        </div>
      </div>

      {/* New courses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center rounded-md bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
            New
          </span>
          <h3 className="font-display font-semibold text-lg">Active courses</h3>
        </div>
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <div className="flex gap-4 pb-1">
            {loading && <p className="text-sm text-muted-foreground py-8">Loading…</p>}
            {!loading &&
              newCourses.map((c) => <CourseCard key={c.id} course={c} />)}
            {!loading && newCourses.length === 0 && (
              <p className="text-sm text-muted-foreground py-6">No active courses.</p>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Completed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center rounded-md bg-green-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            Completed
          </span>
          <h3 className="font-display font-semibold text-lg">Completed courses</h3>
        </div>
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <div className="flex gap-4 pb-1">
            {!loading &&
              completedCourses.map((c) => <CourseCard key={c.id} course={c} />)}
            {!loading && completedCourses.length === 0 && (
              <p className="text-sm text-muted-foreground py-6">Complete a course to see it here.</p>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Course modal */}
      <Dialog open={!!selectedCourse} onOpenChange={(o) => !o && setSelectedCourse(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl pr-6">{selectedCourse.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>
              </DialogHeader>

              <div className="grid md:grid-cols-3 gap-4 mt-2">
                <div className="md:col-span-2 space-y-3">
                  {(() => {
                    const activeModule = activeModuleId
                      ? getCourseModules(selectedCourse.id).find((m) => m.id === activeModuleId)
                      : getCourseModules(selectedCourse.id).find((m) => m.video_url);
                    const moduleProgress = activeModule
                      ? progress.find((p) => p.module_id === activeModule.id)
                      : undefined;

                    return activeModule?.video_url ? (
                      <VideoPlayer
                        key={activeModule.id}
                        moduleId={activeModule.id}
                        agentId={agentId!}
                        videoUrl={activeModule.video_url}
                        durationMinutes={activeModule.duration_minutes}
                        initialWatchedSeconds={moduleProgress?.watched_seconds || 0}
                        isCompleted={isModuleCompleted(activeModule.id)}
                        onComplete={() => {
                          markComplete(activeModule.id);
                        }}
                      />
                    ) : (
                      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm border">
                        <PlayCircle className="h-10 w-10 mr-2 opacity-40" />
                        Select a video module from the syllabus below.
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Overall progress</span>
                    <Badge variant={doneCert ? "default" : "secondary"}>
                      {doneCert ? "Completed" : "In progress"}
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Reminder frequency</p>
                  <Select value={reminderFreq} onValueChange={setReminderFreq}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Email nudges are simulated here — connect automation for production.
                  </p>
                  {doneCert && (
                    <Button className="w-full gap-2" onClick={() => setCertOpen(true)}>
                      <Award className="h-4 w-4" /> Certificate of completion
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Syllabus</p>
                {getCourseModules(selectedCourse.id).map((mod, idx) => {
                  const done = isModuleCompleted(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        done ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "border-border hover:bg-muted/50"
                      } ${activeModuleId === mod.id ? "ring-2 ring-primary" : ""}`}
                      onClick={() => mod.video_url && setActiveModuleId(mod.id)}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {mod.module_type === "video" ? (
                            <PlayCircle className="h-4 w-4 text-accent shrink-0" />
                          ) : (
                            <FileQuestion className="h-4 w-4 text-blue-500 shrink-0" />
                          )}
                          <span className="font-medium text-sm">{mod.title}</span>
                        </div>
                        {mod.duration_minutes != null && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {mod.duration_minutes} min
                          </span>
                        )}
                        <Progress value={done ? 100 : 0} className="h-1 mt-1" />
                      </div>
                      {!done && (
                        <Button size="sm" variant="outline" onClick={() => markComplete(mod.id)}>
                          Mark complete
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Certificate of completion</DialogTitle>
          </DialogHeader>
          <div className="border-2 border-primary/30 rounded-lg p-6 text-center space-y-4 bg-card">
            <img src={remaxLogo} alt="" className="h-10 mx-auto object-contain" />
            <p className="font-display text-lg font-semibold">Certificate of completion</p>
            <p className="text-sm text-muted-foreground">This certifies that</p>
            <p className="font-display text-xl font-bold">{agentName || "Agent"}</p>
            <p className="text-xs text-muted-foreground">RECO# {recoNumber || "—"}</p>
            <p className="text-sm">
              has completed <span className="font-semibold">{selectedCourse?.title}</span>
            </p>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}</p>
            <div className="pt-4 border-t border-dashed text-xs text-muted-foreground">Authorized signature ____________________</div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Share your achievement</p>
            <CertificateShareActions
              agentName={agentName || "Agent"}
              reco={recoNumber || "—"}
              courseTitle={selectedCourse?.title || "Course"}
            />
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                window.print();
                toast({ title: "Print dialog opened", description: "Save as PDF from your browser." });
              }}
            >
              Print / save as PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
