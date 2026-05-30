import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Search, BookOpen, ArrowRight, MapPin } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import { ADMIN_HELP_TOPICS, HELP_CATEGORIES } from "@/config/adminHelpContent";
import AdminHelpBot from "@/components/admin/AdminHelpBot";

export default function AdminHelp() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin]);

  if (loading || (!isAdmin && user)) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const q = search.toLowerCase().trim();
  const filtered = ADMIN_HELP_TOPICS.filter((t) =>
    !q ||
    t.title.toLowerCase().includes(q) ||
    t.summary.toLowerCase().includes(q) ||
    t.keywords.some((k) => k.includes(q))
  );

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
          <h1 className="font-display text-xl font-semibold">Admin Documentation</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e2231a] to-[#1a4d8f]">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold">How to use the Admin Portal</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Everything you can manage, where to find it, and how to do it. Use the assistant (bottom-right) to ask questions.
          </p>
        </div>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search the docs (e.g. video, listing, agent)..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {q ? (
          // Flat search results
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No topics found for "{search}".</p>
            ) : filtered.map((t) => (
              <Card key={t.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-1 text-[10px]">{t.category}</Badge>
                      <h3 className="font-semibold">{t.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.summary}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[#1a4d8f]"><MapPin className="h-3 w-3" /> {t.routeLabel}</p>
                      <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
                        {t.steps.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => navigate(t.route)}>
                      Open <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Grouped by category
          <div className="space-y-6">
            {HELP_CATEGORIES.map((cat) => {
              const topics = ADMIN_HELP_TOPICS.filter((t) => t.category === cat);
              return (
                <div key={cat}>
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{cat}</h3>
                  <Accordion type="multiple" className="space-y-2">
                    {topics.map((t) => (
                      <AccordionItem key={t.id} value={t.id} className="rounded-lg border bg-card px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="text-left">
                            <p className="font-medium text-sm">{t.title}</p>
                            <p className="text-xs text-muted-foreground font-normal">{t.summary}</p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-[#1a4d8f]"><MapPin className="h-3 w-3" /> {t.routeLabel}</p>
                          <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
                            {t.steps.map((s, i) => <li key={i}>{s}</li>)}
                          </ol>
                          <Button size="sm" className="mt-3 gap-1 bg-[#e2231a] hover:bg-[#c41e16]" onClick={() => navigate(t.route)}>
                            Go to this feature <ArrowRight className="h-3 w-3" />
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <AdminHelpBot />
    </div>
  );
}
