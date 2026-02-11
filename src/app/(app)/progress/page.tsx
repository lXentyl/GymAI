"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { type WorkoutLog } from "@/lib/types";
import { SkeletonPage } from "@/components/skeleton-card";
import Reveal from "@/components/reveal";
import { MotionCard } from "@/components/motion-primitives";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-store";
import { kgToLbs, formatWeightUnit } from "@/lib/unit-converter";

export default function ProgressPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const { t, language } = useTranslation();
  const units = useSettings((s) => s.units);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: logData } = await supabase
      .from("workout_logs")
      .select("*, exercise:exercises(name)")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: true });

    if (logData) {
      setLogs(logData);

      // Get unique exercises
      const uniqueExercises = new Map<string, string>();
      logData.forEach((log) => {
        if (!uniqueExercises.has(log.exercise_id)) {
          uniqueExercises.set(
            log.exercise_id,
            (log.exercise as unknown as { name: string })?.name || "Unknown"
          );
        }
      });

      const exList = Array.from(uniqueExercises).map(([id, name]) => ({
        id,
        name,
      }));
      setExercises(exList);
      if (exList.length > 0) setSelectedExercise(exList[0].id);
    }

    setLoading(false);
  };

  const locale = language === "es" ? "es" : "en";

  const convertWeight = (wKg: number) =>
    units === "imperial" ? kgToLbs(wKg) : wKg;

  const chartData = logs
    .filter((log) => log.exercise_id === selectedExercise && log.set_number === 1)
    .map((log) => ({
      date: new Date(log.completed_at).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      }),
      weight: convertWeight(log.weight_kg),
      volume: convertWeight(log.weight_kg) * log.reps,
    }));

  // Personal records
  const filteredLogs = logs.filter(
    (log) => log.exercise_id === selectedExercise
  );
  const maxWeight = filteredLogs.length > 0
    ? convertWeight(Math.max(...filteredLogs.map((l) => l.weight_kg)))
    : 0;
  const maxVolume = filteredLogs.length > 0
    ? Math.round(Math.max(...filteredLogs.map((l) => convertWeight(l.weight_kg) * l.reps)))
    : 0;

  const weightUnit = formatWeightUnit(units);

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <Reveal delay={0}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("progress.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("progress.subtitle")}
          </p>
        </div>
      </Reveal>

      {exercises.length === 0 ? (
        <Reveal delay={0.1}>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center space-y-3">
              <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-semibold">{t("progress.noData")}</p>
              <p className="text-sm text-muted-foreground">
                {t("progress.noData.sub")}
              </p>
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <>
          {/* Exercise Selector */}
          <Reveal delay={0.1}>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {exercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExercise(ex.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium border-2 transition-all ${
                    selectedExercise === ex.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </Reveal>

          {/* PRs */}
          <Reveal delay={0.2}>
            <div className="grid grid-cols-2 gap-3">
              <MotionCard glow>
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      {t("progress.maxWeight")}
                    </p>
                    <p className="text-2xl font-black">
                      {maxWeight}
                      {weightUnit}
                    </p>
                  </CardContent>
                </Card>
              </MotionCard>
              <MotionCard glow>
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      {t("progress.maxVolume")}
                    </p>
                    <p className="text-2xl font-black">{maxVolume}</p>
                  </CardContent>
                </Card>
              </MotionCard>
            </div>
          </Reveal>

          {/* Chart */}
          {chartData.length > 0 && (
            <Reveal delay={0.3}>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-4">
                    {t("progress.weightOverTime")} ({weightUnit})
                  </p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(128,128,128,0.1)"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="hsl(var(--foreground))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--foreground))", r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
