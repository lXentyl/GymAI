"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/reveal";
import { SkeletonPage } from "@/components/skeleton-card";
import { MotionCard } from "@/components/motion-primitives";
import AnimatedNumber from "@/components/animated-number";
import CalorieDonut from "@/components/charts/calorie-donut";
import WaterTank from "@/components/charts/water-tank";
import WeightSparkline from "@/components/charts/weight-sparkline";
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
  Scale,
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
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([]);
  const { t } = useTranslation();
  const units = useSettings((s) => s.units);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t("greeting.morning"));
    else if (hour < 17) setGreeting(t("greeting.afternoon"));
    else setGreeting(t("greeting.evening"));

    loadProfile();
    loadDailyStats();
    loadWeightHistory();
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
      setCaloriesEaten(data.calories || 0);
    }
  };

  const loadWeightHistory = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from("daily_stats")
      .select("date, weight_kg")
      .eq("user_id", user.id)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .not("weight_kg", "is", null)
      .order("date", { ascending: true });

    if (data && data.length > 0) {
      setWeightHistory(
        data
          .filter((d: { weight_kg: number | null }) => d.weight_kg != null)
          .map((d: { date: string; weight_kg: number }) => ({
            date: d.date,
            weight: units === "imperial"
              ? Math.round(d.weight_kg * 2.20462 * 10) / 10
              : d.weight_kg,
          }))
      );
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
    <div className="space-y-4">
      {/* Header */}
      <Reveal delay={0}>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold tracking-tight">{firstName} 👋</h1>
        </div>
      </Reveal>

      {/* ===== BENTO GRID ===== */}
      <div className="grid grid-cols-2 gap-3">

        {/* Streak Card — col-span-2 */}
        <Reveal delay={0.1} className="col-span-2">
          <MotionCard glow>
            <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {t("dashboard.streak")}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <AnimatedNumber
                        value={profile?.current_streak || 0}
                        className="text-4xl font-black tabular-nums"
                      />
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

        {/* Start Workout CTA — col-span-2 */}
        <Reveal delay={0.15} className="col-span-2">
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

        {/* This Week — col-span-1 */}
        <Reveal delay={0.2}>
          <MotionCard glow>
            <Card className="border-border/50 bg-card/50 h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                <TrendingUp className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t("dashboard.thisWeek")}
                </p>
                <AnimatedNumber value={0} className="text-2xl font-black tabular-nums" />
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.workouts")}
                </p>
              </CardContent>
            </Card>
          </MotionCard>
        </Reveal>

        {/* Goal — col-span-1 */}
        <Reveal delay={0.25}>
          <MotionCard glow>
            <Card className="border-border/50 bg-card/50 h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                <Zap className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t("dashboard.goal")}
                </p>
                <p className="text-lg font-bold capitalize">
                  {profile?.goal?.replace("_", " ") || t("general.notSet")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile?.body_type || ""}
                </p>
              </CardContent>
            </Card>
          </MotionCard>
        </Reveal>

        {/* Daily Targets — col-span-2 */}
        {tdee && (
          <Reveal delay={0.3} className="col-span-2">
            <MotionCard glow>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-5 space-y-3">
                  <p className="font-semibold text-sm">
                    {t("dashboard.dailyTargets")}
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-xl bg-foreground/5 p-3">
                      <AnimatedNumber
                        value={adjustedCalories}
                        className="text-lg font-black tabular-nums"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {t("dashboard.calories")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-foreground/5 p-3">
                      <AnimatedNumber
                        value={tdee.protein_g}
                        className="text-lg font-black tabular-nums"
                        suffix="g"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {t("dashboard.protein")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-foreground/5 p-3">
                      <AnimatedNumber
                        value={tdee.carbs_g}
                        className="text-lg font-black tabular-nums"
                        suffix="g"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {t("dashboard.carbs")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-foreground/5 p-3">
                      <AnimatedNumber
                        value={tdee.fat_g}
                        className="text-lg font-black tabular-nums"
                        suffix="g"
                      />
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

        {/* Calorie Donut — col-span-1 */}
        {adjustedCalories > 0 && (
          <Reveal delay={0.35}>
            <MotionCard glow>
              <Card className="border-border/50 bg-card/50 h-full">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-center">
                    {t("dashboard.calories")}
                  </p>
                  <CalorieDonut eaten={caloriesEaten} goal={adjustedCalories} />
                  <p className="text-xs text-muted-foreground text-center">
                    {caloriesEaten} / {adjustedCalories}
                  </p>
                </CardContent>
              </Card>
            </MotionCard>
          </Reveal>
        )}

        {/* Water Tank — col-span-1 */}
        <Reveal delay={0.4}>
          <MotionCard glow>
            <Card className="border-border/50 bg-card/50 h-full">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-blue-400" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {t("dashboard.hydration")}
                  </p>
                </div>
                <WaterTank current={waterMl} target={waterTarget} />
                <p className="text-xs text-muted-foreground text-center">
                  {formatWater(waterMl, units)} / {formatWater(waterTarget, units)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9"
                  onClick={addWater}
                >
                  <Droplets className="h-3.5 w-3.5 mr-1" />
                  +250ml
                </Button>
              </CardContent>
            </Card>
          </MotionCard>
        </Reveal>

        {/* Weight Trend — col-span-2 */}
        {weightHistory.length > 1 && (
          <Reveal delay={0.45} className="col-span-2">
            <MotionCard glow>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {t("profile.weight")} — 30d
                    </p>
                  </div>
                  <WeightSparkline data={weightHistory} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatWeight(weightHistory[0]?.weight || 0, "metric")}</span>
                    <span>{formatWeight(weightHistory[weightHistory.length - 1]?.weight || 0, "metric")}</span>
                  </div>
                </CardContent>
              </Card>
            </MotionCard>
          </Reveal>
        )}

        {/* Quick Links — col-span-2 */}
        <Reveal delay={0.5} className="col-span-2">
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
    </div>
  );
}
