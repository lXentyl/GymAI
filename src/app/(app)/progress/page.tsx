"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
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

export default function ProgressPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedExercise, setSelectedExercise] = useState("");

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

  const chartData = logs
    .filter((log) => log.exercise_id === selectedExercise && log.set_number === 1)
    .map((log) => ({
      date: new Date(log.completed_at).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      }),
      weight: log.weight_kg,
      volume: log.weight_kg * log.reps,
    }));

  // Personal records
  const filteredLogs = logs.filter(
    (log) => log.exercise_id === selectedExercise
  );
  const maxWeight = filteredLogs.length > 0
    ? Math.max(...filteredLogs.map((l) => l.weight_kg))
    : 0;
  const maxVolume = filteredLogs.length > 0
    ? Math.max(...filteredLogs.map((l) => l.weight_kg * l.reps))
    : 0;

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
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Track your strength gains
        </p>
      </div>

      {exercises.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-8 text-center space-y-3">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-semibold">No data yet</p>
            <p className="text-sm text-muted-foreground">
              Complete a workout to see your progress
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Exercise Selector */}
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

          {/* PRs */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Max Weight</p>
                <p className="text-2xl font-black">{maxWeight}kg</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Max Volume</p>
                <p className="text-2xl font-black">{maxVolume}</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-4">Weight Over Time</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#666", fontSize: 10 }}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#666", fontSize: 10 }}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111",
                          border: "1px solid #222",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#fff"
                        strokeWidth={2}
                        dot={{ fill: "#fff", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
