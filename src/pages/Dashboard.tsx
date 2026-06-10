import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import HeroBanner from "@/components/dashboard/HeroBanner";
import DashboardCalendar from "@/components/dashboard/DashboardCalendar";
import TrainingProgressSummary from "@/components/dashboard/TrainingProgressSummary";
import TrainingCourses from "@/components/dashboard/TrainingCourses";
import PreConSection from "@/components/dashboard/PreConSection";
import BuyerPresentationKit from "@/components/dashboard/BuyerPresentationKit";
import VendorDirectory from "@/components/dashboard/VendorDirectory";
import SupportChat from "@/components/dashboard/SupportChat";
import OfficeBooking from "@/components/dashboard/OfficeBooking";
import AgentHelpBot from "@/components/dashboard/AgentHelpBot";
import PortalFooter from "@/components/dashboard/PortalFooter";
import { SectionLabelsProvider } from "@/hooks/useSectionLabels";
import EditableHeading from "@/components/dashboard/EditableHeading";
import { useAuth } from "@/hooks/useAuth";
import { useAgentPortalSettings } from "@/hooks/useAgentPortalSettings";
import { useAgentReminders } from "@/hooks/useAgentReminders";
import { useSectionOrder, type SectionKey } from "@/hooks/useSectionOrder";
import { toast } from "@/hooks/use-toast";
import { PORTAL_SHOWCASE } from "@/config/portalShowcase";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, agent, loading, isAdmin, isActive, signOut } = useAuth();
  const { hideCommissionRates, setHideCommission } = useAgentPortalSettings(agent?.id);
  const { reminders, dismiss } = useAgentReminders(agent?.id);
  const { order } = useSectionOrder();
  const [remindersOpen, setRemindersOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate("/auth");
      else if (!isActive && agent !== null) navigate("/pending");
    }
  }, [user, loading, isActive, agent, navigate]);

  const getInitials = (name: string | null) => {
    if (!name) return "AG";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const agentName = agent?.full_name || `Agent ${agent?.reco_number || ""}`;

  const sectionNodes: Partial<Record<SectionKey, React.ReactNode>> = {
    dashboard: (
      <section
        id="dashboard"
        className="scroll-mt-28 space-y-6 rounded-3xl border border-border/50 bg-card/40 p-5 shadow-sm backdrop-blur-sm md:p-8"
      >
        <EditableHeading sectionKey="dashboard" defaultTitle="Dashboard" defaultSubtitle="Calendar and training at a glance" isAdmin={isAdmin}>
          {(lbl) => (
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">{lbl.title}</h2>
              <p className="text-sm text-muted-foreground">{lbl.subtitle}</p>
            </div>
          )}
        </EditableHeading>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <DashboardCalendar agentId={agent?.id} isAdmin={isAdmin} />
          <TrainingProgressSummary agentId={agent?.id} />
        </div>
      </section>
    ),
    courses: (
      <section
        id="courses"
        className="scroll-mt-28 rounded-3xl border border-border/40 bg-muted/15 p-5 md:p-8"
      >
        <TrainingCourses
          agentId={agent?.id}
          agentName={agent?.full_name}
          recoNumber={agent?.reco_number}
        />
      </section>
    ),
    listings: (
      <div className="rounded-3xl border border-border/40 bg-card/30 p-5 md:p-8">
        <PreConSection
          agentId={agent?.id}
          agentName={agent?.full_name || null}
          agentEmail={agent?.email || user?.email || null}
          recoNumber={agent?.reco_number || null}
          hideCommissionRates={hideCommissionRates}
          section="listings"
        />
      </div>
    ),
    assets: (
      <div className="rounded-3xl border border-border/40 bg-card/30 p-5 md:p-8">
        <PreConSection
          agentId={agent?.id}
          agentName={agent?.full_name || null}
          agentEmail={agent?.email || user?.email || null}
          recoNumber={agent?.reco_number || null}
          hideCommissionRates={hideCommissionRates}
          section="assets"
        />
      </div>
    ),
    "buyer-kit": (
      <section id="buyer-kit" className="scroll-mt-28 rounded-3xl border border-border/50 bg-card/30 p-5 md:p-8">
        <BuyerPresentationKit />
      </section>
    ),
    vendors: (
      <section id="vendors" className="scroll-mt-28 rounded-3xl border border-border/50 bg-card/30 p-5 md:p-8">
        <VendorDirectory />
      </section>
    ),
    support: (
      <section id="support" className="scroll-mt-28 rounded-3xl border border-border/50 bg-muted/10 p-5 md:p-8">
        <SupportChat agentId={agent?.id} userId={user?.id} isAdmin={isAdmin} />
      </section>
    ),
    offices: (
      <section id="offices" className="scroll-mt-28 rounded-3xl border border-border/40 bg-card/40 p-5 md:p-8">
        <OfficeBooking
          agentId={agent?.id}
          agentName={agent?.full_name || null}
          agentEmail={agent?.email || user?.email || null}
        />
      </section>
    ),
  };

  return (
    <div id="top" className="min-h-screen bg-background flex flex-col">
    <SectionLabelsProvider>
      <DashboardHeader
        agentName={agentName}
        fullName={agent?.full_name || null}
        recoNumber={agent?.reco_number || null}
        avatarUrl={agent?.avatar_url || null}
        initials={getInitials(agent?.full_name)}
        isAdmin={isAdmin}
        agentId={agent?.id}
        hideCommissionRates={hideCommissionRates}
        onHideCommissionChange={async (hide) => {
          try {
            await setHideCommission(hide);
            toast({
              title: hide ? "Co-op % hidden" : "Co-op % visible",
              description: hide
                ? "Pre-con commission badges are hidden on your portal."
                : "Agents can see commission rates on listings again.",
            });
          } catch {
            toast({ variant: "destructive", title: "Could not update setting" });
          }
        }}
        reminderCount={reminders.length}
        onOpenReminders={() => setRemindersOpen(true)}
        onLogout={async () => {
          await signOut();
          navigate("/auth");
        }}
      />

      <main className="flex-1 container mx-auto px-4 py-6 space-y-8">
        {!isActive && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="pt-6">
              <p className="text-amber-800 dark:text-amber-200 text-center font-medium">
                Your account is pending activation. Some features may be restricted.
              </p>
            </CardContent>
          </Card>
        )}

        <HeroBanner
          agentName={agentName}
          avatarUrl={agent?.avatar_url || null}
          initials={getInitials(agent?.full_name)}
          recoNumber={agent?.reco_number || null}
          joinedAt={agent?.created_at || null}
        />

        {order.map((key, i) => {
          const node = sectionNodes[key];
          if (!node) return null;
          return (
            <div key={key}>
              {i > 0 && <Separator className="mb-8 opacity-60" />}
              {node}
            </div>
          );
        })}
      </main>

      <PortalFooter />

      {/* Floating AI help assistant for agents */}
      <AgentHelpBot />

      <Sheet open={remindersOpen} onOpenChange={setRemindersOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display">Your reminders</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-1">
            Admins can schedule nudges for courses, pre-con follow-ups, and more.
          </p>
          <div className="mt-6 space-y-3">
            {reminders.length === 0 && <p className="text-sm text-muted-foreground">No active reminders.</p>}
            {reminders.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold text-foreground">{r.title}</p>
                {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground capitalize">{r.entity_type.replace(/_/g, " ")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={async () => {
                    await dismiss(r.id);
                    toast({ title: "Dismissed" });
                  }}
                >
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </SectionLabelsProvider>
    </div>
  );
};

export default Dashboard;
