import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, MapPin, Clock, Users, Bell, Plus, Mail, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { PORTAL_SHOWCASE } from "@/config/portalShowcase";
import { demoCalendarEvents } from "@/data/demoPortalContent";

interface OfficeEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  event_type: string;
}

interface EventRsvp {
  id: string;
  event_id: string;
  status: string;
  notify_email: boolean;
}

interface PersonalReminder {
  id: string;
  title: string;
  at: string;
  note: string;
}

interface DashboardCalendarProps {
  agentId: string | undefined;
  isAdmin: boolean;
}

const REM_KEY = (agentId: string) => `remax-portal-reminders-${agentId}`;

const typeColor = (eventType: string) => {
  const t = eventType.toLowerCase();
  if (t === "training") return "#ea580c";
  if (t === "meeting" || t === "office") return "#2563eb";
  return "#dc2626";
};

const CALENDAR_HELP_TEXT =
  "This calendar shows brokerage events, training, deadlines, and your personal reminders. Click an entry for details or RSVP. On busy days you may see +more — open it, or switch to Week or List to see every item.";

const showcaseTypeColor = (t: string) => {
  switch (t) {
    case "precon":
      return "#dc2626";
    case "office":
      return "#2563eb";
    case "training":
      return "#16a34a";
    case "deadline":
      return "#ea580c";
    case "event":
      return "#f59e0b";
    default:
      return "#64748b";
  }
};

/** Hover popup with full text — month/week cells stay truncated for layout. */
function CalendarEventContent(arg: EventContentArg) {
  const title = arg.event.title?.trim() || "Event";
  const timeText = arg.timeText?.trim() || "";
  const ext = arg.event.extendedProps as {
    kind?: "office" | "personal" | "showcase";
    event?: OfficeEvent;
    reminder?: PersonalReminder;
    demo?: (typeof demoCalendarEvents)[0];
  };

  const metaLines: string[] = [];
  if (ext.kind === "office" && ext.event) {
    if (ext.event.description?.trim()) metaLines.push(ext.event.description.trim());
    if (ext.event.location?.trim()) metaLines.push(`Location: ${ext.event.location.trim()}`);
    metaLines.push(`Type: ${ext.event.event_type}`);
  } else if (ext.kind === "personal" && ext.reminder?.note?.trim()) {
    metaLines.push(ext.reminder.note.trim());
  } else if (ext.kind === "showcase" && ext.demo) {
    metaLines.push(`Category: ${ext.demo.type}`);
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div className="fc-event-main fc-calendar-tooltip-trigger flex min-h-[1.1rem] min-w-0 w-full max-w-full cursor-default">
          <div className="fc-event-main-frame flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-0.5 py-px">
            {!!timeText && (
              <span className="fc-event-time shrink-0 text-[0.65rem] font-semibold leading-tight">{timeText}</span>
            )}
            <div className="fc-event-title-container min-w-0 flex-1 overflow-hidden">
              <div className="fc-event-title truncate text-[0.65rem] leading-tight">{title}</div>
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" sideOffset={8} className="max-w-sm z-[400]">
        <div className="space-y-1.5 text-left">
          {!!timeText && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{timeText}</p>
          )}
          <p className="text-sm font-medium leading-snug">{title}</p>
          {metaLines.map((line, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">
              {line}
            </p>
          ))}
          <p className="border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground">Click for full details</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function DashboardCalendar({ agentId, isAdmin }: DashboardCalendarProps) {
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [seatsLeft, setSeatsLeft] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<OfficeEvent | null>(null);
  const [notifyToggle, setNotifyToggle] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remAt, setRemAt] = useState("");
  const [remNote, setRemNote] = useState("");
  const [personal, setPersonal] = useState<PersonalReminder[]>([]);
  const [selectedDemo, setSelectedDemo] = useState<(typeof demoCalendarEvents)[0] | null>(null);

  const loadReminders = useCallback(() => {
    if (!agentId) return;
    supabase
      .from("personal_reminders")
      .select("*")
      .eq("agent_id", agentId)
      .order("remind_at", { ascending: true })
      .then(({ data }) => {
        setPersonal(
          (data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            at: r.remind_at,
            note: r.note || "",
          }))
        );
      });
  }, [agentId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .order("event_date", { ascending: true });
    setEvents(((data as OfficeEvent[]) || []) as OfficeEvent[]);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!agentId) return;
    supabase
      .from("event_rsvps")
      .select("*")
      .eq("agent_id", agentId)
      .then(({ data }) => setRsvps((data as EventRsvp[]) || []));
  }, [agentId]);

  useEffect(() => {
    if (!selected?.id) return;
    supabase
      .from("event_rsvps")
      .select("id")
      .eq("event_id", selected.id)
      .then(({ data }) => setAttendeeCount(data?.length ?? 0));
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const r = rsvps.find((x) => x.event_id === selected.id);
    setNotifyToggle(!!r?.notify_email);
  }, [selected, rsvps]);

  const isRsvped = (eventId: string) => rsvps.some((r) => r.event_id === eventId);

  const handleRsvp = async (ev: OfficeEvent, notify: boolean) => {
    if (!agentId) return;
    const existing = rsvps.find((r) => r.event_id === ev.id);
    if (existing) {
      await supabase.from("event_rsvps").delete().eq("id", existing.id);
      setRsvps((prev) => prev.filter((r) => r.id !== existing.id));
      setSeatsLeft((s) => ({ ...s, [ev.id]: (s[ev.id] ?? 24) + 1 }));
      toast({ title: "RSVP removed" });
      return;
    }
    const left = seatsLeft[ev.id] ?? 24;
    if (left <= 0) {
      toast({ variant: "destructive", title: "Event full", description: "No seats remaining." });
      return;
    }
    const { data } = await supabase
      .from("event_rsvps")
      .insert({
        event_id: ev.id,
        agent_id: agentId,
        notify_email: notify,
        status: "attending",
      })
      .select()
      .single();
    if (data) {
      setRsvps((prev) => [...prev, data as EventRsvp]);
      setSeatsLeft((s) => ({ ...s, [ev.id]: Math.max(0, (s[ev.id] ?? 24) - 1) }));
      toast({
        title: "You're registered",
        description: notify
          ? "Confirmation & reminders are simulated in this demo."
          : undefined,
      });
    }
  };

  const fcEvents: EventInput[] = useMemo(() => {
    const showcase: EventInput[] = PORTAL_SHOWCASE
      ? demoCalendarEvents.map((d) => ({
          id: d.id,
          title: d.title,
          start: d.start,
          backgroundColor: showcaseTypeColor(d.type),
          borderColor: showcaseTypeColor(d.type),
          extendedProps: { kind: "showcase" as const, demo: d },
        }))
      : [];
    const office: EventInput[] =
      PORTAL_SHOWCASE && showcase.length > 0
        ? []
        : events.map((e) => ({
            id: e.id,
            title: e.title,
            start: e.event_date,
            end: e.end_date || undefined,
            backgroundColor: typeColor(e.event_type),
            borderColor: typeColor(e.event_type),
            extendedProps: { kind: "office" as const, event: e },
          }));
    const mine: EventInput[] = personal.map((r) => ({
      id: r.id,
      title: r.title,
      start: r.at,
      backgroundColor: "#64748b",
      borderColor: "#475569",
      extendedProps: { kind: "personal" as const, reminder: r },
    }));
    return [...showcase, ...office, ...mine];
  }, [events, personal]);

  const onEventClick = (arg: EventClickArg) => {
    const ext = arg.event.extendedProps as {
      kind: "office" | "personal" | "showcase";
      event?: OfficeEvent;
      reminder?: PersonalReminder;
      demo?: (typeof demoCalendarEvents)[0];
    };
    if (ext.kind === "showcase" && ext.demo) {
      setSelected(null);
      setSelectedDemo(ext.demo);
      return;
    }
    if (ext.kind === "office" && ext.event) {
      setSelectedDemo(null);
      setSelected(ext.event);
      setNotifyToggle(isRsvped(ext.event.id));
    } else if (ext.kind === "personal" && ext.reminder) {
      toast({
        title: ext.reminder.title,
        description: ext.reminder.note || format(parseISO(ext.reminder.at), "PPp"),
      });
    }
  };

  const saveReminder = async () => {
    if (!agentId || !remTitle.trim() || !remAt) return;
    const remindAt = new Date(remAt).toISOString();

    const { data, error } = await supabase
      .from("personal_reminders")
      .insert({
        agent_id: agentId,
        title: remTitle.trim(),
        note: remNote.trim() || null,
        remind_at: remindAt,
      })
      .select()
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Could not save reminder", description: error.message });
      return;
    }

    // Add an in-app notification so the bell reflects it
    await supabase.from("in_app_notifications").insert({
      agent_id: agentId,
      title: `Reminder set: ${remTitle.trim()}`,
      body: `${format(new Date(remindAt), "PPp")}${remNote.trim() ? ` — ${remNote.trim()}` : ""}`,
      type: "reminder",
      link: "/dashboard",
    });

    setPersonal((prev) => [
      ...prev,
      { id: data.id, title: data.title, at: data.remind_at, note: data.note || "" },
    ]);
    setReminderOpen(false);
    setRemTitle("");
    setRemAt("");
    setRemNote("");
    toast({ title: "Reminder added", description: "Shown on your calendar and notifications." });
  };

  return (
    <Card className="overflow-hidden border-border/80 bg-card/90 shadow-md backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <CalendarDays className="h-5 w-5 text-accent" />
            Calendar &amp; Events
          </CardTitle>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setReminderOpen(true)}>
            <Plus className="h-4 w-4" /> Add Reminder
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>How this calendar works</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 rounded-full text-muted-foreground outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Calendar tips"
              >
                <HelpCircle className="h-4 w-4" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="text-xs leading-relaxed">
              {CALENDAR_HELP_TEXT}
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="min-h-[480px] fc-theme-standard">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={PORTAL_SHOWCASE ? "2026-04-15" : undefined}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            height="auto"
            aspectRatio={1.05}
            events={fcEvents}
            eventClick={onEventClick}
            eventContent={CalendarEventContent}
            dayMaxEvents={4}
            moreLinkClick="popover"
            eventDidMount={(arg) => {
              const title = arg.event.title?.trim() || "Event";
              const start = arg.event.start;
              let label = title;
              if (start && !arg.event.allDay) {
                try {
                  label = `${format(start, "h:mm a")} — ${title}`;
                } catch {
                  label = title;
                }
              }
              arg.el.setAttribute("aria-label", label);
            }}
            nowIndicator
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {PORTAL_SHOWCASE ? (
            <>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#dc2626]" /> Pre-con
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#2563eb]" /> Office
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#16a34a]" /> Training
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#f59e0b]" /> Events
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#ea580c]" /> Deadline
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#dc2626]" /> Webinar / General
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#2563eb]" /> Office / Meeting
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#ea580c]" /> Training
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#64748b]" /> Personal reminder
              </span>
            </>
          )}
        </div>
        {PORTAL_SHOWCASE && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Sample April 2026 calendar — navigate months to explore. Live events replace this when showcase is off.
          </p>
        )}
      </CardContent>

      <Sheet open={!!selectedDemo} onOpenChange={(o) => !o && setSelectedDemo(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selectedDemo && (
            <>
              <SheetHeader>
                <Badge className="mb-2 w-fit capitalize">{selectedDemo.type}</Badge>
                <SheetTitle className="pr-8 font-display">{selectedDemo.title}</SheetTitle>
                <SheetDescription className="space-y-2 text-left text-sm">
                  <p className="flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    {format(parseISO(selectedDemo.start), "EEEE, MMM d, yyyy — h:mm a")}
                  </p>
                  <p className="text-muted-foreground">
                    Preview event for stakeholder review — connect your events API for production.
                  </p>
                </SheetDescription>
              </SheetHeader>
              <Button
                className="mt-6 w-full"
                onClick={() => {
                  toast({
                    title: "RSVP recorded (demo)",
                    description: "Email confirmation would be sent in production.",
                  });
                  setSelectedDemo(null);
                }}
              >
                Reserve my seat (demo)
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display pr-8">{selected.title}</SheetTitle>
                <SheetDescription className="text-left space-y-3">
                  <Badge variant="outline" className="capitalize">
                    {selected.event_type}
                  </Badge>
                  {selected.description && <p className="text-foreground text-sm">{selected.description}</p>}
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      {format(parseISO(selected.event_date), "EEEE, MMM d, yyyy — h:mm a")}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {selected.location?.toLowerCase().includes("virtual")
                        ? "Virtual"
                        : selected.location || "TBA"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0" />
                      {seatsLeft[selected.id] ?? 24} seats available
                    </p>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Notify me (email + bell)
                  </span>
                  <Switch
                    checked={
                      isRsvped(selected.id)
                        ? !!rsvps.find((r) => r.event_id === selected.id)?.notify_email
                        : notifyToggle
                    }
                    onCheckedChange={(c) => {
                      setNotifyToggle(c);
                      const ex = rsvps.find((r) => r.event_id === selected.id);
                      if (ex && agentId) {
                        supabase
                          .from("event_rsvps")
                          .update({ notify_email: c })
                          .eq("id", ex.id)
                          .then(() => {
                            setRsvps((prev) =>
                              prev.map((r) => (r.id === ex.id ? { ...r, notify_email: c } : r))
                            );
                          });
                      }
                    }}
                  />
                </div>

                {!isRsvped(selected.id) ? (
                  <Button className="w-full" onClick={() => handleRsvp(selected, notifyToggle)}>
                    RSVP / Reserve My Seat
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => handleRsvp(selected, false)}>
                    Cancel RSVP
                  </Button>
                )}

                {isAdmin && (
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Admin</p>
                    <p className="text-sm">Attendees: {attendeeCount}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() =>
                        toast({
                          title: "Blast email",
                          description: "Connect Supabase Edge + email provider to send.",
                        })
                      }
                    >
                      <Mail className="h-4 w-4" /> Send blast to attendees
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personal reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="r-title">Title</Label>
              <Input id="r-title" value={remTitle} onChange={(e) => setRemTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="r-at">Date &amp; time</Label>
              <Input
                id="r-at"
                type="datetime-local"
                value={remAt}
                onChange={(e) => setRemAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="r-note">Note (optional)</Label>
              <Textarea id="r-note" value={remNote} onChange={(e) => setRemNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveReminder} disabled={!agentId}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
