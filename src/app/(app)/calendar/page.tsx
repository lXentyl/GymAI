"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Flame,
  Dumbbell,
  Moon,
  X as XMark,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { SkeletonPage } from "@/components/skeleton-card";
import Reveal from "@/components/reveal";
import ErrorBoundary from "@/components/error-boundary";
import { useTranslation } from "@/lib/i18n";
import { type Profile, type CalendarEvent, type CalendarEventType } from "@/lib/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "legs", "arms", "core", "push", "pull", "fullBody",
] as const;

const EVENT_CONFIG: Record<CalendarEventType, { color: string; icon: typeof Dumbbell; bg: string }> = {
  workout: { color: "bg-emerald-400", icon: Dumbbell, bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  rest: { color: "bg-blue-400", icon: Moon, bg: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  missed: { color: "bg-red-400", icon: XMark, bg: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export default function CalendarPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CalendarEventType>("workout");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { t, language } = useTranslation();

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const [{ data: profileData }, { data: eventData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", start.toISOString().split("T")[0])
          .lte("date", end.toISOString().split("T")[0]),
      ]);

      if (profileData) setProfile(profileData);
      if (eventData) setEvents(eventData);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calendar generation helpers
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getDateStr = (day: number) =>
    `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getEventForDay = (day: number): CalendarEvent | undefined =>
    events.find((e) => e.date === getDateStr(day));

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const changeMonth = (offset: number) => {
    setLoading(true);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  // Dialog handlers
  const openDialog = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
    const existing = getEventForDay(day);
    if (existing) {
      setSelectedType(existing.event_type as CalendarEventType);
      setSelectedMuscle(existing.muscle_group || "");
    } else {
      setSelectedType("workout");
      setSelectedMuscle("");
    }
    setDialogOpen(true);
  };

  const saveEvent = async () => {
    if (!selectedDate || !profile) return;
    setSaving(true);

    const supabase = createClient();
    const dateStr = selectedDate.toISOString().split("T")[0];
    const existing = events.find((e) => e.date === dateStr);

    try {
      if (existing) {
        await supabase
          .from("calendar_events")
          .update({
            event_type: selectedType,
            muscle_group: selectedType === "workout" ? selectedMuscle || null : null,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("calendar_events").insert({
          user_id: profile.id,
          date: dateStr,
          event_type: selectedType,
          muscle_group: selectedType === "workout" ? selectedMuscle || null : null,
        });
      }

      toast.success(t("calendar.eventSaved"));
      setDialogOpen(false);
      await loadData();
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!selectedDate) return;
    setSaving(true);

    const supabase = createClient();
    const dateStr = selectedDate.toISOString().split("T")[0];
    const existing = events.find((e) => e.date === dateStr);

    if (existing) {
      try {
        await supabase.from("calendar_events").delete().eq("id", existing.id);
        toast.success(t("calendar.eventDeleted"));
        setDialogOpen(false);
        await loadData();
      } catch {
        toast.error(t("toast.error"));
      }
    }
    setSaving(false);
  };

  // Weekly summary
  const getWeeklyWorkoutCount = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return events.filter((e) => {
      const eventDate = new Date(e.date);
      return e.event_type === "workout" && eventDate >= startOfWeek && eventDate <= endOfWeek;
    }).length;
  };

  const DAYS = [
    t("calendar.sun"), t("calendar.mon"), t("calendar.tue"),
    t("calendar.wed"), t("calendar.thu"), t("calendar.fri"), t("calendar.sat"),
  ];

  const locale = language === "es" ? "es" : "en";
  const totalWorkoutDays = events.filter((e) => e.event_type === "workout").length;
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  if (loading) return <SkeletonPage />;
  if (error) return <ErrorBoundary onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <Reveal delay={0}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("calendar.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("calendar.subtitle")}</p>
        </div>
      </Reveal>

      {/* Streak + Stats Row */}
      <Reveal delay={0.1}>
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Flame className="h-7 w-7 text-orange-400" />
                <div>
                  <p className="text-2xl font-black">{profile?.current_streak || 0}</p>
                  <p className="text-xs text-muted-foreground">{t("calendar.dayStreak")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-7 w-7 text-emerald-400" />
                <div>
                  <p className="text-2xl font-black">{totalWorkoutDays}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("calendar.ofDays", { days: daysInMonth })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Reveal>

      {/* Calendar Grid */}
      <Reveal delay={0.2}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </Button>
              <p className="font-semibold capitalize">
                {currentMonth.toLocaleDateString(locale, { month: "long", year: "numeric" })}
              </p>
              <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {getDaysInMonth().map((day, i) => {
                const event = day ? getEventForDay(day) : undefined;
                const dotColor = event ? EVENT_CONFIG[event.event_type as CalendarEventType].color : "";

                return (
                  <motion.div
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    className={`relative flex flex-col h-12 items-center justify-center rounded-xl text-sm transition-all ${
                      day === null
                        ? ""
                        : isToday(day)
                        ? "bg-foreground text-background font-bold"
                        : event
                        ? "bg-foreground/5 font-medium cursor-pointer hover:bg-foreground/10"
                        : "text-muted-foreground cursor-pointer hover:bg-foreground/5"
                    }`}
                    onClick={() => day && openDialog(day)}
                  >
                    {day}
                    {day && event && (
                      <div className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${dotColor}`} />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Legend */}
      <Reveal delay={0.25}>
        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
          {(["workout", "rest", "missed"] as const).map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${EVENT_CONFIG[type].color}`} />
              <span>{t(`calendar.${type}`)}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
            <span>{t("calendar.today")}</span>
          </div>
        </div>
      </Reveal>

      {/* Weekly Summary */}
      <Reveal delay={0.3}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Dumbbell className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-sm font-medium">
                {t("calendar.trainedThisWeek", { count: getWeeklyWorkoutCount() })}
              </p>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Add Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md glass-strong border-border/30">
          <DialogHeader>
            <DialogTitle>{t("calendar.addEvent")}</DialogTitle>
            <DialogDescription>
              {selectedDate?.toLocaleDateString(locale, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>

          {/* Day Summary — show existing event details */}
          {selectedDate && events.find((e) => e.date === selectedDate.toISOString().split("T")[0]) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-foreground/5 p-3 space-y-1"
            >
              {(() => {
                const ev = events.find((e) => e.date === selectedDate.toISOString().split("T")[0])!;
                const config = EVENT_CONFIG[ev.event_type as CalendarEventType];
                const Icon = config.icon;
                return (
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${config.bg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm capitalize">{t(`calendar.${ev.event_type}`)}</p>
                      {ev.muscle_group && (
                        <p className="text-xs text-muted-foreground capitalize">{t(`calendar.${ev.muscle_group}`)}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          <div className="space-y-5 py-2">
            {/* Event Type Selector */}
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence>
                {(["workout", "rest", "missed"] as const).map((type) => {
                  const config = EVENT_CONFIG[type];
                  const Icon = config.icon;
                  const isSelected = selectedType === type;

                  return (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedType(type)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? config.bg
                          : "border-border/50 text-muted-foreground hover:border-foreground/20"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium">{t(`calendar.${type}`)}</span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Muscle Group Selector (only for workout) */}
            {selectedType === "workout" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-sm font-medium">{t("calendar.selectMuscle")}</label>
                <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
                  <SelectTrigger className="h-12 bg-background/50">
                    <SelectValue placeholder={t("calendar.selectMuscle")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((mg) => (
                      <SelectItem key={mg} value={mg}>
                        {t(`calendar.${mg}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={saveEvent}
                disabled={saving}
                className="flex-1 h-12 font-semibold"
              >
                {saving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="h-4 w-4 border-2 border-background border-t-transparent rounded-full"
                  />
                ) : (
                  t("calendar.save")
                )}
              </Button>

              {/* Delete button only if event exists */}
              {selectedDate && events.find((e) => e.date === selectedDate.toISOString().split("T")[0]) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={deleteEvent}
                  disabled={saving}
                  className="h-12 w-12 text-red-400 hover:text-red-300 hover:border-red-400/50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
