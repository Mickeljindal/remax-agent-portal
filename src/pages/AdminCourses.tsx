import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  GraduationCap,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  PlayCircle,
  FileQuestion,
  GripVertical,
  Video,
} from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import UploadHint, { UPLOAD_PRESETS } from "@/components/admin/UploadHint";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  sort_order: number;
  created_at: string;
}

interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  module_type: string;
  video_url: string | null;
  duration_minutes: number | null;
  sort_order: number;
  is_active: boolean;
  content: any;
}

const CATEGORIES = [
  "Compliance",
  "Sales Training",
  "Marketing",
  "Technology",
  "Pre-Construction",
  "Onboarding",
  "Paid Course",
  "General",
];

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Course form
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "General",
    thumbnail_url: "",
    is_mandatory: false,
    is_active: true,
  });
  const [savingCourse, setSavingCourse] = useState(false);

  // Module form
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    module_type: "video",
    video_url: "",
    duration_minutes: "",
    is_active: true,
  });
  const [savingModule, setSavingModule] = useState(false);

  // Video upload
  const { progress, speed, uploadVideo } = useVideoUpload();

  // Expanded course for viewing modules
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

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
    const [coursesRes, modulesRes] = await Promise.all([
      supabase.from("courses").select("*").order("sort_order"),
      supabase.from("course_modules").select("*").order("sort_order"),
    ]);
    setCourses((coursesRes.data as Course[]) || []);
    setModules((modulesRes.data as CourseModule[]) || []);
    setLoadingData(false);
  };

  // ─── Course CRUD ───────────────────────────────────────────────
  const openNewCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      title: "",
      description: "",
      category: "General",
      thumbnail_url: "",
      is_mandatory: false,
      is_active: true,
    });
    setCourseDialogOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || "",
      category: course.category,
      thumbnail_url: course.thumbnail_url || "",
      is_mandatory: course.is_mandatory,
      is_active: course.is_active,
    });
    setCourseDialogOpen(true);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }
    setSavingCourse(true);

    if (editingCourse) {
      const { error } = await supabase
        .from("courses")
        .update({
          title: courseForm.title.trim(),
          description: courseForm.description.trim() || null,
          category: courseForm.category,
          thumbnail_url: courseForm.thumbnail_url.trim() || null,
          is_mandatory: courseForm.is_mandatory,
          is_active: courseForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCourse.id);

      if (error) {
        toast({ variant: "destructive", title: error.message });
      } else {
        toast({ title: "Course updated" });
        setCourseDialogOpen(false);
        fetchData();
      }
    } else {
      const maxOrder = courses.length > 0 ? Math.max(...courses.map((c) => c.sort_order)) + 1 : 0;
      const { error } = await supabase.from("courses").insert({
        title: courseForm.title.trim(),
        description: courseForm.description.trim() || null,
        category: courseForm.category,
        thumbnail_url: courseForm.thumbnail_url.trim() || null,
        is_mandatory: courseForm.is_mandatory,
        is_active: courseForm.is_active,
        sort_order: maxOrder,
        created_by: user!.id,
      });

      if (error) {
        toast({ variant: "destructive", title: error.message });
      } else {
        toast({ title: "Course created" });
        setCourseDialogOpen(false);
        fetchData();
      }
    }
    setSavingCourse(false);
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm("Delete this course and all its modules? This cannot be undone.")) return;
    // Delete modules first
    await supabase.from("course_modules").delete().eq("course_id", courseId);
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: "Course deleted" });
      fetchData();
    }
  };

  // ─── Module CRUD ───────────────────────────────────────────────
  const openNewModule = (courseId: string) => {
    setSelectedCourseId(courseId);
    setEditingModule(null);
    setModuleForm({
      title: "",
      description: "",
      module_type: "video",
      video_url: "",
      duration_minutes: "",
      is_active: true,
    });
    setModuleDialogOpen(true);
  };

  const openEditModule = (mod: CourseModule) => {
    setSelectedCourseId(mod.course_id);
    setEditingModule(mod);
    setModuleForm({
      title: mod.title,
      description: mod.description || "",
      module_type: mod.module_type,
      video_url: mod.video_url || "",
      duration_minutes: mod.duration_minutes?.toString() || "",
      is_active: mod.is_active,
    });
    setModuleDialogOpen(true);
  };

  const saveModule = async () => {
    if (!moduleForm.title.trim() || !selectedCourseId) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }
    setSavingModule(true);

    const courseModules = modules.filter((m) => m.course_id === selectedCourseId);

    if (editingModule) {
      const { error } = await supabase
        .from("course_modules")
        .update({
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim() || null,
          module_type: moduleForm.module_type,
          video_url: moduleForm.video_url.trim() || null,
          duration_minutes: moduleForm.duration_minutes ? parseInt(moduleForm.duration_minutes) : null,
          is_active: moduleForm.is_active,
        })
        .eq("id", editingModule.id);

      if (error) toast({ variant: "destructive", title: error.message });
      else {
        toast({ title: "Module updated" });
        setModuleDialogOpen(false);
        fetchData();
      }
    } else {
      const maxOrder = courseModules.length > 0 ? Math.max(...courseModules.map((m) => m.sort_order)) + 1 : 0;
      const { error } = await supabase.from("course_modules").insert({
        course_id: selectedCourseId,
        title: moduleForm.title.trim(),
        description: moduleForm.description.trim() || null,
        module_type: moduleForm.module_type,
        video_url: moduleForm.video_url.trim() || null,
        duration_minutes: moduleForm.duration_minutes ? parseInt(moduleForm.duration_minutes) : null,
        is_active: moduleForm.is_active,
        sort_order: maxOrder,
      });

      if (error) toast({ variant: "destructive", title: error.message });
      else {
        toast({ title: "Module added" });
        setModuleDialogOpen(false);
        fetchData();
      }
    }
    setSavingModule(false);
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm("Delete this module?")) return;
    const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: "Module deleted" });
      fetchData();
    }
  };

  const getCourseModules = (courseId: string) =>
    modules.filter((m) => m.course_id === courseId).sort((a, b) => a.sort_order - b.sort_order);

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
          <h1 className="font-display text-xl font-semibold">Course Management</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Courses & Modules
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create courses, add video modules, and manage your training library.
            </p>
          </div>
          <Button onClick={openNewCourse} className="gap-2">
            <Plus className="h-4 w-4" /> New Course
          </Button>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No courses yet. Create your first course to get started.</p>
              <Button onClick={openNewCourse} className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Create Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => {
              const courseModules = getCourseModules(course.id);
              const isExpanded = expandedCourseId === course.id;

              return (
                <Card key={course.id} className={!course.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{course.title}</CardTitle>
                          <Badge variant="outline" className="text-xs">{course.category}</Badge>
                          {course.is_mandatory && <Badge variant="destructive" className="text-xs">Required</Badge>}
                          {!course.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </div>
                        <CardDescription className="mt-1">
                          {course.description || "No description"} · {courseModules.length} module{courseModules.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => openNewModule(course.id)} className="gap-1">
                          <Plus className="h-3 w-3" /> Module
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditCourse(course)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCourse(course.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent>
                      {courseModules.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No modules yet. Add video or quiz modules to this course.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">#</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Video URL</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {courseModules.map((mod, idx) => (
                              <TableRow key={mod.id}>
                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="font-medium">{mod.title}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {mod.module_type === "video" ? (
                                      <PlayCircle className="h-4 w-4 text-blue-500" />
                                    ) : (
                                      <FileQuestion className="h-4 w-4 text-amber-500" />
                                    )}
                                    <span className="capitalize text-sm">{mod.module_type}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{mod.duration_minutes ? `${mod.duration_minutes} min` : "—"}</TableCell>
                                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                  {mod.video_url || "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={mod.is_active ? "default" : "secondary"} className="text-xs">
                                    {mod.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEditModule(mod)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteModule(mod.id)} className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "New Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                placeholder="e.g. Ontario Real Estate Compliance 2026"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="Brief description of the course..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={courseForm.category} onValueChange={(v) => setCourseForm({ ...courseForm, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input
                  value={courseForm.thumbnail_url}
                  onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
                <UploadHint {...UPLOAD_PRESETS.courseThumbnail} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={courseForm.is_mandatory}
                  onCheckedChange={(v) => setCourseForm({ ...courseForm, is_mandatory: v })}
                />
                <Label>Mandatory</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={courseForm.is_active}
                  onCheckedChange={(v) => setCourseForm({ ...courseForm, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCourse} disabled={savingCourse}>
              {savingCourse && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCourse ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {editingModule ? "Edit Module" : "Add Module"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="e.g. Introduction to FINTRAC"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="What this module covers..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={moduleForm.module_type} onValueChange={(v) => setModuleForm({ ...moduleForm, module_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={moduleForm.duration_minutes}
                  onChange={(e) => setModuleForm({ ...moduleForm, duration_minutes: e.target.value })}
                  placeholder="e.g. 15"
                />
              </div>
            </div>
            {moduleForm.module_type === "video" && (
              <div className="space-y-3">
                <div>
                  <Label>Upload Video File (stored on your server)</Label>
                  <div className="mt-1">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted w-fit">
                        <Video className="h-4 w-4" />
                        {moduleForm.video_url && moduleForm.video_url.includes("course-videos")
                          ? "Replace video"
                          : "Choose video file"}
                      </div>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !selectedCourseId) return;
                          const result = await uploadVideo(file, selectedCourseId, moduleForm.title || "module");
                          if (result) {
                            setModuleForm({ ...moduleForm, video_url: result.url });
                          }
                        }}
                      />
                    </label>
                    <UploadHint {...UPLOAD_PRESETS.courseVideo} />
                    {progress.status === "uploading" && (
                      <div className="mt-3 space-y-1.5">
                        <Progress value={progress.percent} className="h-2.5" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{progress.percent}% uploaded</span>
                          <span>
                            {progress.loadedBytes != null && progress.totalBytes != null
                              ? `${fmtBytes(progress.loadedBytes)} / ${fmtBytes(progress.totalBytes)}`
                              : ""}
                            {speed ? ` · ${speed}` : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Uploading to your server — keep this dialog open.</p>
                      </div>
                    )}
                    {progress.status === "done" && (
                      <p className="text-xs text-green-600 mt-2 font-medium">✓ Video uploaded to server successfully</p>
                    )}
                    {progress.status === "error" && (
                      <p className="text-xs text-destructive mt-2">Upload failed: {progress.error}</p>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-x-0 top-1/2 border-t border-muted" />
                  <p className="relative bg-background px-2 text-xs text-muted-foreground w-fit mx-auto">or paste external URL</p>
                </div>
                <div>
                  <Label>Video URL (YouTube/Vimeo embed)</Label>
                  <Input
                    value={moduleForm.video_url}
                    onChange={(e) => setModuleForm({ ...moduleForm, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/embed/..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    YouTube: youtube.com/embed/VIDEO_ID · Vimeo: player.vimeo.com/video/VIDEO_ID
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={moduleForm.is_active}
                onCheckedChange={(v) => setModuleForm({ ...moduleForm, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveModule} disabled={savingModule}>
              {savingModule && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingModule ? "Update" : "Add Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
