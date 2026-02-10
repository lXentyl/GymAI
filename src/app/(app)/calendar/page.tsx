"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Profile } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) setProfile(profileData);

    // Get workout dates for current month
    const start = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const end = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    const { data: logs } = await supabase
      .from("workout_logs")
      .select("completed_at")
      .eq("user_id", user.id)
      .gte("completed_at", start.toISOString())
      .lte("completed_at", end.toISOString());

    if (logs) {
      const dates = new Set<string>();
      logs.forEach((log) => {
        dates.add(new Date(log.completed_at).toISOString().split("T")[0]);
      });
      setWorkoutDates(dates);
    }

    setLoading(false);
  };

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

  const isWorkoutDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return workoutDates.has(dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    );
  };

  const totalWorkoutDays = workoutDates.size;
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Your training history
        </p>
      </div>

      {/* Streak Card */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-black">
                  {profile?.current_streak || 0}
                </p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{totalWorkoutDays}</p>
              <p className="text-xs text-muted-foreground">
                of {daysInMonth} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-semibold">
              {currentMonth.toLocaleDateString("en", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs text-muted-foreground font-medium py-1"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {getDaysInMonth().map((day, i) => (
              <div
                key={i}
                className={`relative flex h-10 items-center justify-center rounded-lg text-sm transition-all ${
                  day === null
                    ? ""
                    : isToday(day)
                    ? "bg-foreground text-background font-bold"
                    : isWorkoutDay(day)
                    ? "bg-foreground/10 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {day}
                {day && isWorkoutDay(day) && (
                  <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-400" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span>Workout completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
