import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, Loader2, Mail } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import remaxLogo from "@/assets/remax-excellence-logo.png";

interface Agent {
  id: string;
  full_name: string | null;
  email: string | null;
  reco_number: string;
  avatar_url: string | null;
  is_active: boolean;
}

const AgentDirectory = () => {
  const navigate = useNavigate();
  const { user, agent, loading, isAdmin, isActive, signOut } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const { data } = await supabase
      .from("agents")
      .select("id, full_name, email, reco_number, avatar_url, is_active")
      .eq("is_active", true)
      .order("full_name", { ascending: true });
    setAgents(data || []);
    setLoadingAgents(false);
  };

  const filtered = agents.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.reco_number?.toLowerCase().includes(q)
    );
  });

  const getInitials = (name: string | null) => {
    if (!name) return "AG";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const agentName = agent?.full_name || `Agent ${agent?.reco_number || ""}`;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        agentName={agentName}
        fullName={agent?.full_name || null}
        recoNumber={agent?.reco_number || null}
        avatarUrl={agent?.avatar_url || null}
        initials={getInitials(agent?.full_name)}
        isAdmin={isAdmin}
        onLogout={async () => { await signOut(); navigate("/auth"); }}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">Agent Directory</h2>
            <p className="text-muted-foreground">Find and connect with fellow agents</p>
          </div>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or RECO#..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loadingAgents ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((a) => (
              <Card key={a.id} className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={a.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(a.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground truncate">{a.full_name || "Agent"}</h4>
                      <p className="text-xs text-muted-foreground">RECO# {a.reco_number}</p>
                      {a.email && (
                        <a href={`mailto:${a.email}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {a.email}
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">No agents found.</p>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4 text-center">
          <img src={remaxLogo} alt="REMAX Excellence" className="h-8 mx-auto mb-3 brightness-0 invert opacity-80" />
          <p className="text-sm text-primary-foreground/70">© 2024 REMAX Excellence. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AgentDirectory;
