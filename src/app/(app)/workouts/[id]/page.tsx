"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PerformanceArrow from "@/components/performance-arrow";
import {
  Loader2,
  ChevronLeft,
  RefreshCw,
  Check,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { type WorkoutPlanExercise, type WorkoutLog, type Exercise } from "@/lib/types";
import { getSubstitute, filterByEquipment } from "@/lib/ai-trainer";

interface SetEntry {
  weight: string;
  reps: string;
  completed: boolean;
}

interface ExerciseWithSets {
  planExercise: WorkoutPlanExercise;
  exercise: Exercise;
  sets: SetEntry[];
  previousBest: { weight: number; reps: number } | null;
}

export default function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  const loadWorkout = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get plan exercises
    const { data: planExercises } = await supabase
      .from("workout_plan_exercises")
      .select("*, exercise:exercises(*)")
      .eq("plan_id", id)
      .order("sort_order");

    if (!planExercises) {
      setLoading(false);
      return;
    }

    // Get previous logs for comparison
    const exerciseIds = planExercises.map((pe) => pe.exercise_id);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: previousLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .in("exercise_id", exerciseIds)
      .gte("completed_at", oneWeekAgo.toISOString())
      .order("completed_at", { ascending: false });

    // Build exercise list with previous data
    const exerciseData: ExerciseWithSets[] = planExercises.map((pe) => {
      const prevLog = previousLogs?.find(
        (log) => log.exercise_id === pe.exercise_id
      );

      return {
        planExercise: pe,
        exercise: pe.exercise,
        sets: Array.from({ length: pe.sets }, () => ({
          weight: "",
          reps: "",
          completed: false,
        })),
        previousBest: prevLog
          ? { weight: prevLog.weight_kg, reps: prevLog.reps }
          : null,
      };
    });

    setExercises(exerciseData);
    setLoading(false);
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "weight" | "reps",
    value: string
  ) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets.map((s, i) =>
          i === setIndex ? { ...s, [field]: value } : s
        ),
      };
      return updated;
    });
  };

  const toggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets.map((s, i) =>
          i === setIndex ? { ...s, completed: !s.completed } : s
        ),
      };
      return updated;
    });
  };

  const swapExercise = async (exerciseIndex: number) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: allExercises } = await supabase
      .from("exercises")
      .select("*") as { data: Exercise[] | null };

    const { data: equipment } = await supabase
      .from("equipment_inventory")
      .select("equipment_name")
      .eq("user_id", user.id);

    if (!allExercises || !equipment) return;

    const userEquipment = equipment.map((e) => e.equipment_name);
    const currentExercise = exercises[exerciseIndex].exercise;
    const usedIds = exercises.map((e) => e.exercise.id);

    const substitute = getSubstitute(
      currentExercise,
      allExercises,
      userEquipment,
      usedIds
    );

    if (substitute) {
      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = {
          ...updated[exerciseIndex],
          exercise: substitute,
          previousBest: null,
        };
        return updated;
      });
    }
  };

  const saveWorkout = async () => {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const logs = exercises.flatMap((ex) =>
      ex.sets
        .filter((s) => s.completed && s.weight && s.reps)
        .map((s, i) => ({
          user_id: user.id,
          exercise_id: ex.exercise.id,
          plan_id: id,
          set_number: i + 1,
          weight_kg: parseFloat(s.weight),
          reps: parseInt(s.reps),
          completed_at: new Date().toISOString(),
        }))
    );

    if (logs.length > 0) {
      await supabase.from("workout_logs").insert(logs);
    }

    // Update streak (increment directly)
    try {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak")
        .eq("id", user.id)
        .single();

      const newStreak = (currentProfile?.current_streak || 0) + 1;
      const longestStreak = Math.max(
        newStreak,
        currentProfile?.longest_streak || 0
      );

      await supabase
        .from("profiles")
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch {
      // Silently handle if profile update fails
    }

    setCompleted(true);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-10 w-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold">Workout Complete! 💪</h2>
        <p className="text-muted-foreground">
          Great job! Your progress has been saved.
        </p>
        <Link href="/dashboard">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/workouts">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Active Workout</h1>
          <p className="text-xs text-muted-foreground">
            {exercises.length} exercises
          </p>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-4">
        {exercises.map((ex, exIdx) => (
          <Card key={exIdx} className="border-border/50 bg-card/50">
            <CardContent className="p-4 space-y-3">
              {/* Exercise Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{ex.exercise.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {ex.exercise.muscle_group} •{" "}
                    {ex.exercise.equipment_required}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => swapExercise(exIdx)}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Swap
                </Button>
              </div>

              {/* Previous Performance */}
              {ex.previousBest && (
                <div className="flex items-center gap-2 rounded-lg bg-foreground/5 px-3 py-2">
                  <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Last week: {ex.previousBest.weight}kg ×{" "}
                    {ex.previousBest.reps} reps
                  </span>
                </div>
              )}

              {/* Sets */}
              <div className="space-y-2">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs text-muted-foreground px-1">
                  <span>Set</span>
                  <span>Weight (kg)</span>
                  <span>Reps</span>
                  <span></span>
                </div>

                {ex.sets.map((set, setIdx) => {
                  const currentVolume =
                    parseFloat(set.weight || "0") *
                    parseInt(set.reps || "0");
                  const previousVolume = ex.previousBest
                    ? ex.previousBest.weight * ex.previousBest.reps
                    : 0;

                  return (
                    <div
                      key={setIdx}
                      className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center ${
                        set.completed ? "opacity-50" : ""
                      }`}
                    >
                      <span className="text-center text-sm font-medium text-muted-foreground">
                        {setIdx + 1}
                      </span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.weight}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, "weight", e.target.value)
                        }
                        className="h-11 bg-background/50 text-center text-base font-semibold"
                        disabled={set.completed}
                      />
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={set.reps}
                          onChange={(e) =>
                            updateSet(exIdx, setIdx, "reps", e.target.value)
                          }
                          className="h-11 bg-background/50 text-center text-base font-semibold"
                          disabled={set.completed}
                        />
                        {set.weight && set.reps && currentVolume > 0 && (
                          <div className="absolute -top-2 -right-2">
                            <PerformanceArrow
                              current={currentVolume}
                              previous={previousVolume}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleSetComplete(exIdx, setIdx)}
                        className={`flex h-11 w-10 items-center justify-center rounded-lg border-2 transition-all ${
                          set.completed
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : "border-border hover:border-foreground/30"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save */}
      <Button
        className="w-full h-14 text-lg font-bold"
        onClick={saveWorkout}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "Complete Workout ✅"
        )}
      </Button>
    </div>
  );
}
