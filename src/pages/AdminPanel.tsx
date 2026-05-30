import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  UserCheck,
  UserX,
  Trash2,
  Key,
  Search,
  Shield,
  ShieldOff,
  BarChart3,
  Link as LinkIcon,
  Store,
  MapPin,
  GraduationCap,
  Bell,
  Share2,
  BookOpen,
} from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import AdminHelpBot from "@/components/admin/AdminHelpBot";

interface Agent {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  reco_number: string;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [actionType, setActionType] = useState<
    "activate" | "deactivate" | "delete" | "reset-password" | "make-admin" | "remove-admin" | null
  >(null);
  const [newPassword, setNewPassword] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/dashboard");
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to access the admin panel.",
        });
      }
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAgents();
    }
  }, [isAdmin]);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch agents.",
      });
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleActivate = async (agent: Agent, activate: boolean) => {
    setProcessingAction(true);
    try {
      const { error } = await supabase
        .from("agents")
        .update({ is_active: activate })
        .eq("id", agent.id);

      if (error) throw error;

      // If activating, also assign the agent role
      if (activate) {
        await supabase.from("user_roles").upsert({
          user_id: agent.user_id,
          role: "agent" as const,
        });
      }

      await fetchAgents();
      toast({
        title: activate ? "Agent Activated" : "Agent Deactivated",
        description: `${agent.full_name || agent.reco_number} has been ${activate ? "activated" : "deactivated"}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update agent status.",
      });
    } finally {
      setProcessingAction(false);
      setSelectedAgent(null);
      setActionType(null);
    }
  };

  const handleDelete = async (agent: Agent) => {
    setProcessingAction(true);
    try {
      // Delete agent profile (user will remain in auth but won't have access)
      const { error } = await supabase.from("agents").delete().eq("id", agent.id);

      if (error) throw error;

      // Remove any roles
      await supabase.from("user_roles").delete().eq("user_id", agent.user_id);

      await fetchAgents();
      toast({
        title: "Agent Deleted",
        description: `${agent.full_name || agent.reco_number} has been removed from the system.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete agent.",
      });
    } finally {
      setProcessingAction(false);
      setSelectedAgent(null);
      setActionType(null);
    }
  };

  const handleResetPassword = async (agent: Agent) => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setProcessingAction(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          targetUserId: agent.user_id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;

      toast({
        title: "Password Reset",
        description: `Password for ${agent.full_name || agent.reco_number} has been reset successfully.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset password.",
      });
    } finally {
      setProcessingAction(false);
      setSelectedAgent(null);
      setActionType(null);
      setNewPassword("");
    }
  };

  const handleToggleAdmin = async (agent: Agent, makeAdmin: boolean) => {
    setProcessingAction(true);
    try {
      if (makeAdmin) {
        await supabase.from("user_roles").upsert({
          user_id: agent.user_id,
          role: "admin" as const,
        });
      } else {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", agent.user_id)
          .eq("role", "admin");
      }

      toast({
        title: makeAdmin ? "Admin Added" : "Admin Removed",
        description: `${agent.full_name || agent.reco_number} ${makeAdmin ? "is now an admin" : "is no longer an admin"}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update admin status.",
      });
    } finally {
      setProcessingAction(false);
      setSelectedAgent(null);
      setActionType(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "AG";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.reco_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || (!isAdmin && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img
              src={remaxLogo}
              alt="REMAX Excellence"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
          </div>
          <h1 className="font-display text-xl font-semibold">Admin Panel</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/admin/analytics")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Analytics Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Track agent engagement and content views
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/admin/vendors")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Approved vendors</h3>
                  <p className="text-sm text-muted-foreground">
                    Trades and services shown on the agent dashboard
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/admin/links")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <LinkIcon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Links</h3>
                  <p className="text-sm text-muted-foreground">
                    Update Google Drive URLs for resources
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/precon")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-sky-500/15 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Pre-con cities &amp; projects</h3>
                  <p className="text-sm text-muted-foreground">Cities, filters, commission %, listings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/listings")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-sky-600/15 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-sky-700" />
                </div>
                <div>
                  <h3 className="font-semibold">Listings & categories</h3>
                  <p className="text-sm text-muted-foreground">Tags, types, statuses, full CRUD</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/worksheets")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-600/15 flex items-center justify-center">
                  <LinkIcon className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-semibold">Pre-con worksheets</h3>
                  <p className="text-sm text-muted-foreground">View &amp; manage worksheet submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/precon-library")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-fuchsia-600/15 flex items-center justify-center">
                  <LinkIcon className="h-6 w-6 text-fuchsia-700" />
                </div>
                <div>
                  <h3 className="font-semibold">Pre-con document library</h3>
                  <p className="text-sm text-muted-foreground">Shared forms: showing instructions, clauses, etc.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/course-assignments")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Course assignments</h3>
                  <p className="text-sm text-muted-foreground">Assign training to agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/courses")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Course management</h3>
                  <p className="text-sm text-muted-foreground">Create courses, add video modules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/course-analytics")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-rose-500/15 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Course analytics</h3>
                  <p className="text-sm text-muted-foreground">Watch time, completions, per-agent stats</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/reminders")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-semibold">Agent reminders</h3>
                  <p className="text-sm text-muted-foreground">Nudges for courses, pre-con, vendors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/properties")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-teal-500/15 flex items-center justify-center">
                  <Store className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Property management</h3>
                  <p className="text-sm text-muted-foreground">Add/edit listings, assign to agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/events")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Events management</h3>
                  <p className="text-sm text-muted-foreground">Create events, notify agents, track RSVPs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/support")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-500/15 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Support inbox</h3>
                  <p className="text-sm text-muted-foreground">Chat with agents, manage tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/social-share")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Social share icons</h3>
                  <p className="text-sm text-muted-foreground">WhatsApp, Facebook, LinkedIn, X, email, copy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-[#e2231a]/30" onClick={() => navigate("/admin/help")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#e2231a]/15 to-[#1a4d8f]/15 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-[#e2231a]" />
                </div>
                <div>
                  <h3 className="font-semibold">Documentation &amp; Help</h3>
                  <p className="text-sm text-muted-foreground">Guides + assistant for "where do I find…"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Agent Management
            </CardTitle>
            <CardDescription>
              Manage agent accounts, activation status, and passwords
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, RECO number, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Agents Table */}
            {loadingAgents ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? "No agents found matching your search." : "No agents registered yet."}
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>RECO Number</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={agent.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {getInitials(agent.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {agent.full_name || "Unnamed Agent"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{agent.reco_number}</TableCell>
                        <TableCell>{agent.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={agent.is_active ? "default" : "secondary"}>
                            {agent.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {agent.is_active ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setActionType("deactivate");
                                }}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setActionType("activate");
                                }}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setActionType("reset-password");
                              }}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setActionType("make-admin");
                              }}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setActionType("delete");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Activate/Deactivate Dialog */}
      <AlertDialog
        open={actionType === "activate" || actionType === "deactivate"}
        onOpenChange={(open) => !open && setActionType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "activate" ? "Activate Agent?" : "Deactivate Agent?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "activate"
                ? `This will activate ${selectedAgent?.full_name || selectedAgent?.reco_number}'s account, allowing them to access the portal.`
                : `This will deactivate ${selectedAgent?.full_name || selectedAgent?.reco_number}'s account, preventing them from accessing the portal.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedAgent && handleActivate(selectedAgent, actionType === "activate")
              }
              disabled={processingAction}
            >
              {processingAction ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : actionType === "activate" ? (
                "Activate"
              ) : (
                "Deactivate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={actionType === "delete"}
        onOpenChange={(open) => !open && setActionType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedAgent?.full_name || selectedAgent?.reco_number}
              's profile from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAgent && handleDelete(selectedAgent)}
              disabled={processingAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={actionType === "reset-password"}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedAgent?.full_name || selectedAgent?.reco_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionType(null);
                setNewPassword("");
              }}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedAgent && handleResetPassword(selectedAgent)}
              disabled={processingAction || newPassword.length < 6}
            >
              {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Make/Remove Admin Dialog */}
      <AlertDialog
        open={actionType === "make-admin" || actionType === "remove-admin"}
        onOpenChange={(open) => !open && setActionType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "make-admin" ? "Grant Admin Access?" : "Remove Admin Access?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "make-admin"
                ? `This will grant ${selectedAgent?.full_name || selectedAgent?.reco_number} admin privileges, allowing them to manage other agents.`
                : `This will remove admin privileges from ${selectedAgent?.full_name || selectedAgent?.reco_number}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedAgent && handleToggleAdmin(selectedAgent, actionType === "make-admin")
              }
              disabled={processingAction}
            >
              {processingAction ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : actionType === "make-admin" ? (
                "Grant Admin"
              ) : (
                "Remove Admin"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating AI help assistant */}
      <AdminHelpBot />
    </div>
  );
};

export default AdminPanel;
