import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MapPin, Users, DoorOpen, Clock, Video, CheckCircle2, Phone,
  ChevronLeft, ChevronRight, CalendarCheck,
} from "lucide-react";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Location { id: string; name: string; address: string | null; phone: string | null; }
interface Room { id: string; location_id: string; name: string; capacity: number | null; amenities: string | null; is_virtual: boolean; }
interface Booking { id: string; room_id: string; agent_id: string; title: string; start_time: string; end_time: string; is_virtual: boolean; status: string; }

interface OfficeBookingProps {
  agentId: string | undefined;
}

// 9 AM - 6 PM hourly slots
const SLOTS = Array.from({ length: 9 }, (_, i) => {
  const h = 9 + i;
  return { value: `${h.toString().padStart(2, "0")}:00`, label: `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "PM" : "AM"}` };
});

export default function OfficeBooking({ agentId }: OfficeBookingProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()));

  // Booking dialog
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [bookSlot, setBookSlot] = useState<string>("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookDuration, setBookDuration] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchBookings(); }, [selectedDate]);

  const fetchData = async () => {
    const { data: locData } = await supabase.from("office_locations").select("*").eq("is_active", true).order("sort_order");
    const locs = (locData as Location[]) || [];
    setLocations(locs);
    if (locs.length && !activeLocationId) setActiveLocationId(locs[0].id);
    const { data: roomData } = await supabase.from("meeting_rooms").select("*").eq("is_active", true);
    setRooms((roomData as Room[]) || []);
  };

  const fetchBookings = async () => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);
    const { data } = await supabase
      .from("room_bookings")
      .select("*")
      .gte("start_time", dayStart.toISOString())
      .lt("start_time", dayEnd.toISOString());
    setBookings((data as Booking[]) || []);
  };

  const isSlotBooked = (roomId: string, slot: string) => {
    const [h] = slot.split(":").map(Number);
    const slotStart = new Date(selectedDate); slotStart.setHours(h, 0, 0, 0);
    return bookings.some((b) => {
      if (b.room_id !== roomId) return false;
      const s = new Date(b.start_time); const e = new Date(b.end_time);
      return slotStart >= s && slotStart < e;
    });
  };

  const myBooking = (roomId: string, slot: string) => {
    const [h] = slot.split(":").map(Number);
    const slotStart = new Date(selectedDate); slotStart.setHours(h, 0, 0, 0);
    return bookings.find((b) => {
      if (b.room_id !== roomId || b.agent_id !== agentId) return false;
      const s = new Date(b.start_time); const e = new Date(b.end_time);
      return slotStart >= s && slotStart < e;
    });
  };

  const openBooking = (room: Room, slot: string) => {
    setBookingRoom(room);
    setBookSlot(slot);
    setBookTitle("");
    setBookDuration(1);
  };

  const confirmBooking = async () => {
    if (!agentId || !bookingRoom || !bookTitle.trim()) {
      toast({ variant: "destructive", title: "Enter a meeting title" });
      return;
    }
    setSaving(true);
    const [h] = bookSlot.split(":").map(Number);
    const start = new Date(selectedDate); start.setHours(h, 0, 0, 0);
    const end = new Date(start); end.setHours(h + bookDuration, 0, 0, 0);

    const { error } = await supabase.from("room_bookings").insert({
      room_id: bookingRoom.id,
      agent_id: agentId,
      title: bookTitle.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_virtual: bookingRoom.is_virtual,
    });
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: error.message }); return; }

    // In-app notification confirming the booking
    await supabase.from("in_app_notifications").insert({
      agent_id: agentId,
      title: `Room booked: ${bookingRoom.name}`,
      body: `${format(start, "EEE MMM d")} · ${format(start, "h:mm a")}–${format(end, "h:mm a")}`,
      type: "info",
      link: "/dashboard",
    });

    toast({ title: "Booking confirmed!", description: `${bookingRoom.name} · ${format(start, "MMM d, h:mm a")}` });
    setBookingRoom(null);
    fetchBookings();
  };

  const cancelBooking = async (bookingId: string) => {
    await supabase.from("room_bookings").delete().eq("id", bookingId);
    toast({ title: "Booking cancelled" });
    fetchBookings();
  };

  const mapSrc = (loc: Location) => `https://maps.google.com/maps?q=${encodeURIComponent(loc.address || loc.name)}&output=embed`;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const activeLoc = locations.find((l) => l.id === activeLocationId);
  const activeRooms = rooms.filter((r) => r.location_id === activeLocationId);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#e2231a] to-[#1a4d8f] flex items-center justify-center shadow-sm">
          <DoorOpen className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Office Locations &amp; Booking</h2>
          <p className="text-sm text-muted-foreground">Reserve a meeting room — pick a location, day, and time</p>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <DoorOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No office locations configured yet</p>
        </div>
      ) : (
        <>
          {/* Location selector — RE/MAX styled pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setActiveLocationId(loc.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  activeLocationId === loc.id
                    ? "border-[#e2231a] bg-[#e2231a] text-white shadow-md"
                    : "border-border bg-card hover:border-[#1a4d8f]/40 hover:bg-muted"
                )}
              >
                <MapPin className="h-4 w-4" /> {loc.name}
              </button>
            ))}
          </div>

          {activeLoc && (
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              {/* Left: location info + map */}
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-border">
                  <iframe
                    title={`Map ${activeLoc.name}`}
                    className="w-full h-44"
                    src={mapSrc(activeLoc)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="font-display font-semibold text-foreground">{activeLoc.name}</p>
                  {activeLoc.address && (
                    <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[#e2231a]" /> {activeLoc.address}
                    </p>
                  )}
                  {activeLoc.phone && (
                    <a href={`tel:${activeLoc.phone.replace(/\D/g, "")}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#1a4d8f] hover:underline">
                      <Phone className="h-4 w-4" /> {activeLoc.phone}
                    </a>
                  )}
                  <div className="mt-3 border-t pt-3 text-xs text-muted-foreground space-y-0.5">
                    <p>Mon–Fri · 9:00 AM – 6:00 PM</p>
                    <p>Sat · 10:00 AM – 4:00 PM</p>
                    <p>Sun · Closed</p>
                  </div>
                </div>
              </div>

              {/* Right: week strip + rooms with slots */}
              <div className="space-y-4">
                {/* Week navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-1 gap-1.5 overflow-x-auto">
                    {weekDays.map((day) => {
                      const active = isSameDay(day, selectedDate);
                      const isPast = day < startOfDay(new Date());
                      return (
                        <button
                          key={day.toISOString()}
                          disabled={isPast}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "flex min-w-[52px] flex-1 flex-col items-center rounded-lg border py-2 transition-all",
                            active ? "border-[#1a4d8f] bg-[#1a4d8f] text-white shadow-sm"
                              : isPast ? "border-border/50 bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                              : "border-border bg-card hover:border-[#1a4d8f]/40 hover:bg-muted"
                          )}
                        >
                          <span className="text-[10px] font-medium uppercase">{format(day, "EEE")}</span>
                          <span className="text-base font-bold">{format(day, "d")}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm font-medium text-foreground">
                  Availability for <span className="text-[#e2231a]">{format(selectedDate, "EEEE, MMMM d")}</span>
                </p>

                {/* Rooms */}
                {activeRooms.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">No rooms configured for this location.</p>
                ) : (
                  <div className="space-y-3">
                    {activeRooms.map((room) => (
                      <Card key={room.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {room.is_virtual ? <Video className="h-4 w-4 text-[#1a4d8f]" /> : <DoorOpen className="h-4 w-4 text-[#e2231a]" />}
                              <div>
                                <p className="font-semibold text-sm">{room.name}</p>
                                {room.amenities && <p className="text-xs text-muted-foreground">{room.amenities}</p>}
                              </div>
                            </div>
                            {room.capacity && (
                              <Badge variant="outline" className="text-xs gap-1"><Users className="h-3 w-3" /> {room.capacity}</Badge>
                            )}
                          </div>
                          {/* Time slots */}
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                            {SLOTS.map((slot) => {
                              const booked = isSlotBooked(room.id, slot.value);
                              const mine = myBooking(room.id, slot.value);
                              return (
                                <button
                                  key={slot.value}
                                  disabled={booked && !mine}
                                  onClick={() => mine ? cancelBooking(mine.id) : openBooking(room, slot.value)}
                                  className={cn(
                                    "rounded-md py-1.5 text-xs font-medium transition-all",
                                    mine ? "bg-[#1a4d8f] text-white hover:bg-[#e2231a]"
                                      : booked ? "bg-muted text-muted-foreground/50 line-through cursor-not-allowed"
                                      : "bg-green-50 text-green-700 hover:bg-[#e2231a] hover:text-white dark:bg-green-950/30 dark:text-green-300"
                                  )}
                                  title={mine ? "Click to cancel your booking" : booked ? "Booked" : "Click to book"}
                                >
                                  {mine ? "✓ Yours" : slot.label}
                                </button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Booking confirmation dialog */}
      <Dialog open={!!bookingRoom} onOpenChange={(o) => !o && setBookingRoom(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#e2231a]" /> Confirm Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <p className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-muted-foreground" /> {bookingRoom?.name}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> {format(selectedDate, "EEEE, MMM d")} at {SLOTS.find((s) => s.value === bookSlot)?.label}</p>
            </div>
            <div>
              <Label>Meeting title</Label>
              <Input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="e.g. Buyer consultation" autoFocus />
            </div>
            <div>
              <Label>Duration</Label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => setBookDuration(d)}
                    className={cn(
                      "flex-1 rounded-md border py-2 text-sm font-medium transition-all",
                      bookDuration === d ? "border-[#e2231a] bg-[#e2231a] text-white" : "border-border hover:bg-muted"
                    )}
                  >
                    {d} hr{d > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingRoom(null)}>Cancel</Button>
            <Button onClick={confirmBooking} disabled={saving} className="gap-1.5 bg-[#e2231a] hover:bg-[#c41e16]">
              {saving ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
