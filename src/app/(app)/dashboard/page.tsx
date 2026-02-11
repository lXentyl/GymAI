"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StatCard from "@/components/stat-card";
import Reveal from "@/components/reveal";
import { SkeletonPage } from "@/components/skeleton-card";
import { MotionCard } from "@/components/motion-primitives";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-store";
import { formatWeight, formatWater } from "@/lib/unit-converter";
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
import {
  calculateWaterTarget,
  calculateTDEE,
  getCalorieAdjustment,
} from "@/lib/calculations";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [greeting, setGreeting] = useState("");
  const [waterMl, setWaterMl] = useState(0);
  const [waterTarget, setWaterTarget] = useState(2800);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const units = useSettings((s) => s.units);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t("greeting.morning"));
    else if (hour < 17) setGreeting(t("greeting.afternoon"));
    else setGreeting(t("greeting.evening"));

    loadProfile();
    loadDailyStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

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
    setLoading(false);
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

  // TDEE Calculations
  const tdee =
    profile?.weight_kg && profile?.height_cm && profile?.age && profile?.gender
      ? calculateTDEE(
          profile.weight_kg,
          profile.height_cm,
          profile.age,
          profile.gender
        )
      : null;

  const adjustedCalories =
    tdee && profile?.goal ? getCalorieAdjustment(profile.goal, tdee.tdee) : 0;

  const firstName = profile?.full_name?.split(" ")[0] || "Athlete";

  if (loading) return <SkeletonPage />;

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
        <MotionCard glow>
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {t("dashboard.streak")}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tabular-nums">
                      {profile?.current_streak || 0}
                    </span>
                    <span className="text-lg text-muted-foreground">
                      {t("dashboard.days")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.best")}: {profile?.longest_streak || 0}{" "}
                    {t("dashboard.days")}
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5">
                  <Flame className="h-8 w-8 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionCard>
      </Reveal>

      {/* Start Workout CTA */}
      <Reveal delay={0.2}>
        <Link href="/workouts">
          <MotionCard>
            <Card className="border-border/50 bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/10">
                      <Dumbbell className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">
                        {t("dashboard.startWorkout")}
                      </p>
                      <p className="text-xs opacity-70">
                        {t("dashboard.startWorkout.sub")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-50 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </MotionCard>
        </Link>
      </Reveal>

      {/* Stats Grid */}
      <Reveal delay={0.3}>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={TrendingUp}
            label={t("dashboard.thisWeek")}
            value="0"
            subtitle={t("dashboard.workouts")}
          />
          <StatCard
            icon={Zap}
            label={t("dashboard.goal")}
            value={profile?.goal?.replace("_", " ") || t("general.notSet")}
            subtitle={profile?.body_type || ""}
          />
        </div>
      </Reveal>

      {/* Daily Targets (AI Calculations) */}
      {tdee && (
        <Reveal delay={0.35}>
          <MotionCard glow>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-5 space-y-3">
                <p className="font-semibold text-sm">
                  {t("dashboard.dailyTargets")}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-foreground/5 p-3">
                    <p className="text-lg font-black tabular-nums">
                      {adjustedCalories}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("dashboard.calories")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-foreground/5 p-3">
                    <p className="text-lg font-black tabular-nums">
                      {tdee.protein_g}g
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("dashboard.protein")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-foreground/5 p-3">
                    <p className="text-lg font-black tabular-nums">
                      {tdee.carbs_g}g
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("dashboard.carbs")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-foreground/5 p-3">
                    <p className="text-lg font-black tabular-nums">
                      {tdee.fat_g}g
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("dashboard.fats")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionCard>
        </Reveal>
      )}

      {/* Water Tracker */}
      <Reveal delay={0.4}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-400" />
                <span className="font-semibold">{t("dashboard.hydration")}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatWater(waterMl, units)} / {formatWater(waterTarget, units)}
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
              {t("dashboard.addGlass")} (250ml)
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      {/* Quick Links */}
      <Reveal delay={0.45}>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/nutrition">
            <MotionCard>
              <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl mb-1">🥗</p>
                  <p className="text-xs font-medium">{t("nav.nutrition")}</p>
                </CardContent>
              </Card>
            </MotionCard>
          </Link>
          <Link href="/calendar">
            <MotionCard>
              <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl mb-1">📅</p>
                  <p className="text-xs font-medium">{t("nav.calendar")}</p>
                </CardContent>
              </Card>
            </MotionCard>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
