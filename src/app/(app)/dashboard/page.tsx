"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StatCard from "@/components/stat-card";
import Reveal from "@/components/reveal";
import {
  Flame,
  Dumbbell,
  Droplets,
  TrendingUp,
  ChevronRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { type Profile } from "@/lib/types";
import { calculateWaterTarget } from "@/lib/calculations";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [greeting, setGreeting] = useState("");
  const [waterMl, setWaterMl] = useState(0);
  const [waterTarget, setWaterTarget] = useState(2400);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    loadProfile();
    loadDailyStats();
  }, []);

  const loadProfile = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      if (data.weight_kg) {
        setWaterTarget(calculateWaterTarget(data.weight_kg));
      }
    }
  };

  const loadDailyStats = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("daily_stats")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (data) {
      setWaterMl(data.water_ml || 0);
    }
  };

  const addWater = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newAmount = waterMl + 250;
    setWaterMl(newAmount);

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("daily_stats").upsert(
      {
        user_id: user.id,
        date: today,
        water_ml: newAmount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );
  };

  const firstName = profile?.full_name?.split(" ")[0] || "Athlete";

  return (
    <div className="space-y-6">
      {/* Header */}
      <Reveal delay={0}>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold tracking-tight">{firstName} 👋</h1>
        </div>
      </Reveal>

      {/* Streak Card */}
      <Reveal delay={0.1}>
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Current Streak
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tabular-nums">
                    {profile?.current_streak || 0}
                  </span>
                  <span className="text-lg text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Best: {profile?.longest_streak || 0} days
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5">
                <Flame className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Start Workout CTA */}
      <Reveal delay={0.2}>
        <Link href="/workouts">
          <Card className="border-border/50 bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer group">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/10">
                    <Dumbbell className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Start Workout</p>
                    <p className="text-xs opacity-70">
                      AI-generated based on your goals
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 opacity-50 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </Reveal>

      {/* Stats Grid */}
      <Reveal delay={0.3}>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={TrendingUp}
            label="This Week"
            value="0"
            subtitle="workouts"
          />
          <StatCard
            icon={Zap}
            label="Goal"
            value={profile?.goal?.replace("_", " ") || "Not set"}
            subtitle={profile?.body_type || ""}
          />
        </div>
      </Reveal>

      {/* Water Tracker */}
      <Reveal delay={0.35}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-400" />
                <span className="font-semibold">Hydration</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {waterMl}ml / {waterTarget}ml
              </span>
            </div>
            <Progress
              value={Math.min((waterMl / waterTarget) * 100, 100)}
              className="h-2"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-10"
              onClick={addWater}
            >
              <Droplets className="h-4 w-4 mr-2" />
              Add Glass (250ml)
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      {/* Quick Links */}
      <Reveal delay={0.4}>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/nutrition">
            <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-all cursor-pointer">
              <CardContent className="p-4 text-center">
                <p className="text-2xl mb-1">🥗</p>
                <p className="text-xs font-medium">Nutrition</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/calendar">
            <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-all cursor-pointer">
              <CardContent className="p-4 text-center">
                <p className="text-2xl mb-1">📅</p>
                <p className="text-xs font-medium">Calendar</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
