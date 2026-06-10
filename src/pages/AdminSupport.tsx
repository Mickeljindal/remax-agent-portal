import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useSupportCategories } from "@/hooks/useSupportCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  Loader2,
  MessageSquare,
  Send,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import { useAdminCardLabels } from "@/hooks/useAdminCardLabels";

interface Agent {
  id: string;
  user_id: string;
  full_name: string | null;
  reco_number: string;
  avatar_url: string | null;
  email: string | null;
}

interface Ticket {
  id: string;
  agent_id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const STATUS_OPTIONS = ["open", "in-progress", "resolved", "closed"];

export default function AdminSupport() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { label: cardLabel } = useAdminCardLabels();
  const pageLabel = cardLabel("support", "Support inbox", "Chat with agents, manage tickets");
  const { sendNotification } = useNotifications();
  const { categories } = useSupportCategories();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loadingData, setLoadingData] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New conversation dialog
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [newConvoAgentId, setNewConvoAgentId] = useState("");
  const [newConvoSubject, setNewConvoSubject] = useState("");
  const [newConvoMessage, setNewConvoMessage] = useState("");
  const [newConvoCategory, setNewConvoCategory] = useState("general");

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

  // Real-time subscription for new messages
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("admin-support-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          // If viewing this ticket, add message
          if (selectedTicket && newMsg.ticket_id === selectedTicket.id) {
            setMessages((prev) => [...prev, newMsg]);
          }
          // Refresh ticket list to update "last message" indicators
          fetchTickets();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_tickets" },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchData = async () => {
    setLoadingData(true);
    const [agentsRes, ticketsRes] = await Promise.all([
      supabase.from("agents").select("id, user_id, full_name, reco_number, avatar_url, email"),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
    ]);
    setAgents((agentsRes.data as Agent[]) || []);
    setTickets((ticketsRes.data as Ticket[]) || []);
    setLoadingData(false);
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    setTickets((data as Ticket[]) || []);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
  };

  const selectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const sendReply = async () => {
    if (!selectedTicket || !user || !newMessage.trim()) return;
    setSending(true);

    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      message: newMessage.trim(),
      is_admin: true,
    });

    // Update ticket status to in-progress if it was open
    if (selectedTicket.status === "open") {
      await supabase
        .from("support_tickets")
        .update({ status: "in-progress", updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);
      setSelectedTicket({ ...selectedTicket, status: "in-progress" });
      fetchTickets();
    }

    // Notify agent via in-app notification
    await supabase.from("in_app_notifications").insert({
      agent_id: selectedTicket.agent_id,
      title: `New reply on: ${selectedTicket.subject}`,
      body: newMessage.trim().slice(0, 100),
      type: "info",
      link: "/dashboard",
    });

    // Email notification to agent
    const agent = agents.find((a) => a.id === selectedTicket.agent_id);
    if (agent?.email) {
      sendNotification({
        type: "course_reminder",
        recipientEmail: agent.email,
        recipientName: agent.full_name || "Agent",
        recipientAgentId: agent.id,
        subject: `Reply on your support ticket: ${selectedTicket.subject}`,
        body: `Hi ${agent.full_name || "Agent"},\n\nYou have a new reply on your support ticket "${selectedTicket.subject}":\n\n"${newMessage.trim().slice(0, 200)}"\n\nLog in to the portal to continue the conversation.\n\nBest regards,\nRE/MAX Excellence Support`,
      });
    }

    setNewMessage("");
    setSending(false);
  };

  const updateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;
    await supabase
      .from("support_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", selectedTicket.id);
    setSelectedTicket({ ...selectedTicket, status });
    fetchTickets();
    toast({ title: `Ticket marked as ${status}` });
  };

  const startNewConversation = async () => {
    if (!newConvoAgentId || !newConvoSubject.trim() || !user) {
      toast({ variant: "destructive", title: "Select an agent and enter a subject" });
      return;
    }

    // Create ticket on behalf of admin initiating
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        agent_id: newConvoAgentId,
        subject: newConvoSubject.trim(),
        category: newConvoCategory,
        status: "open",
        priority: "normal",
      })
      .select()
      .single();

    if (error || !ticket) {
      toast({ variant: "destructive", title: error?.message || "Failed to create conversation" });
      return;
    }

    // Send initial message from admin
    if (newConvoMessage.trim()) {
      await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: newConvoMessage.trim(),
        is_admin: true,
      });
    }

    // Notify agent
    await supabase.from("in_app_notifications").insert({
      agent_id: newConvoAgentId,
      title: `New message from admin: ${newConvoSubject.trim()}`,
      body: newConvoMessage.trim().slice(0, 100) || "You have a new support conversation.",
      type: "info",
      link: "/dashboard",
    });

    // Email notification
    const agent = agents.find((a) => a.id === newConvoAgentId);
    if (agent?.email) {
      sendNotification({
        type: "course_reminder",
        recipientEmail: agent.email,
        recipientName: agent.full_name || "Agent",
        recipientAgentId: agent.id,
        subject: `New message from admin: ${newConvoSubject.trim()}`,
        body: `Hi ${agent.full_name || "Agent"},\n\nThe admin team has started a new conversation with you:\n\nSubject: ${newConvoSubject.trim()}\n${newConvoMessage.trim() ? `\nMessage: "${newConvoMessage.trim().slice(0, 200)}"` : ""}\n\nLog in to the portal to reply.\n\nBest regards,\nRE/MAX Excellence Support`,
      });
    }

    setNewConvoOpen(false);
    setNewConvoAgentId("");
    setNewConvoSubject("");
    setNewConvoMessage("");
    fetchTickets();
    selectTicket(ticket as Ticket);
    toast({ title: "Conversation started" });
  };

  const getAgent = (agentId: string) => agents.find((a) => a.id === agentId);
  const getInitials = (name: string | null) => {
    if (!name) return "AG";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const statusColors: Record<string, string> = {
    open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    "in-progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    closed: "bg-muted text-muted-foreground",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    open: <AlertCircle className="h-3 w-3" />,
    "in-progress": <Clock className="h-3 w-3" />,
    resolved: <CheckCircle2 className="h-3 w-3" />,
    closed: <CheckCircle2 className="h-3 w-3" />,
  };

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    const agent = getAgent(t.agent_id);
    const matchesSearch =
      !searchQuery ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent?.reco_number?.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading || (!isAdmin && user)) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg shrink-0">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={remaxLogo} alt="" className="h-10 w-auto brightness-0 invert object-contain" />
          </div>
          <h1 className="font-display text-xl font-semibold">{pageLabel.title}</h1>
          <Button onClick={() => setNewConvoOpen(true)} className="gap-2 bg-white/10 hover:bg-white/20 text-primary-foreground">
            <Plus className="h-4 w-4" /> New Conversation
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — Ticket List */}
        <div className="w-full max-w-sm border-r flex flex-col bg-background">
          {/* Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ticket list */}
          <ScrollArea className="flex-1">
            {loadingData ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No tickets found</div>
            ) : (
              <div className="divide-y">
                {filteredTickets.map((ticket) => {
                  const agent = getAgent(ticket.agent_id);
                  const isSelected = selectedTicket?.id === ticket.id;

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => selectTicket(ticket)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                          <AvatarImage src={agent?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            {getInitials(agent?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground truncate">
                              {agent?.full_name || "Unknown Agent"}
                            </p>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${statusColors[ticket.status] || ""}`}>
                              {ticket.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold truncate mt-0.5">{ticket.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">{ticket.category}</Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedTicket ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b flex items-center justify-between bg-background">
                <div className="flex items-center gap-3">
                  {(() => {
                    const agent = getAgent(selectedTicket.agent_id);
                    return (
                      <>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={agent?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getInitials(agent?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-sm">{selectedTicket.subject}</h3>
                          <p className="text-xs text-muted-foreground">
                            {agent?.full_name || "Unknown"} · {agent?.reco_number} · {selectedTicket.category}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedTicket.status} onValueChange={updateTicketStatus}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Send the first reply.</p>
                  )}
                  {messages.map((msg) => {
                    const isAdminMsg = msg.is_admin;
                    const agent = !isAdminMsg ? getAgent(selectedTicket.agent_id) : null;

                    return (
                      <div key={msg.id} className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}>
                        <div className={`flex items-end gap-2 max-w-[70%] ${isAdminMsg ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-7 w-7 shrink-0">
                            {isAdminMsg ? (
                              <AvatarFallback className="bg-accent text-accent-foreground text-[10px]">AD</AvatarFallback>
                            ) : (
                              <>
                                <AvatarImage src={agent?.avatar_url || undefined} />
                                <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                                  {getInitials(agent?.full_name || null)}
                                </AvatarFallback>
                              </>
                            )}
                          </Avatar>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm ${
                              isAdminMsg
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${isAdminMsg ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {format(new Date(msg.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply input */}
              <div className="p-4 border-t bg-background">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    className="flex-1"
                    disabled={selectedTicket.status === "closed"}
                  />
                  <Button onClick={sendReply} disabled={sending || !newMessage.trim() || selectedTicket.status === "closed"} size="icon">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {selectedTicket.status === "closed" && (
                  <p className="text-xs text-muted-foreground text-center mt-2">This ticket is closed. Reopen it to send messages.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a ticket from the left or start a new conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={newConvoOpen} onOpenChange={setNewConvoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Start New Conversation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Agent *</label>
              <Select value={newConvoAgentId} onValueChange={setNewConvoAgentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents
                    .filter((a) => a.full_name)
                    .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
                    .map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {agent.full_name} · {agent.reco_number}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Subject *</label>
              <Input
                value={newConvoSubject}
                onChange={(e) => setNewConvoSubject(e.target.value)}
                placeholder="e.g. Follow up on listing photos"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={newConvoCategory} onValueChange={setNewConvoCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newConvoMessage}
                onChange={(e) => setNewConvoMessage(e.target.value)}
                placeholder="Type your message to the agent..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewConvoOpen(false)}>Cancel</Button>
            <Button onClick={startNewConversation} className="gap-2">
              <Send className="h-4 w-4" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
