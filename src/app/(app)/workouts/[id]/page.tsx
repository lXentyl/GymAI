"use client";

import { useEffect, useState, use, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PerformanceArrow from "@/components/performance-arrow";
import RestTimer from "@/components/rest-timer";
import AnimatedNumber from "@/components/animated-number";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  Timer,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { type WorkoutPlanExercise, type WorkoutLog, type Exercise } from "@/lib/types";
import { getSubstitute } from "@/lib/ai-trainer";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-store";
import { formatWeight } from "@/lib/unit-converter";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [direction, setDirection] = useState(1);
  const { t } = useTranslation();
  const units = useSettings((s) => s.units);

  useEffect(() => {
    loadWorkout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const set = exercises[exerciseIndex].sets[setIndex];
    const wasComplete = set.completed;

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

    // Auto-trigger rest timer when completing a set
    if (!wasComplete && set.weight && set.reps) {
      setShowTimer(true);
    }
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

  const goToExercise = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
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

  const handleTimerComplete = useCallback(() => setShowTimer(false), []);
  const handleTimerSkip = useCallback(() => setShowTimer(false), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 space-y-4 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10"
        >
          <Check className="h-12 w-12 text-emerald-400" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold"
        >
          {t("workouts.complete")} 💪
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground"
        >
          {t("workouts.progressSaved")}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Link href="/dashboard">
            <Button className="mt-4">{t("workouts.backToDashboard")}</Button>
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  const currentEx = exercises[currentIndex];
  if (!currentEx) return null;

  const completedSets = currentEx.sets.filter((s) => s.completed).length;
  const totalSets = currentEx.sets.length;
  const totalCompletedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalTotalSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0
  );

  return (
    <>
      {/* Rest Timer Overlay */}
      <RestTimer
        seconds={currentEx.planExercise.rest_seconds || 90}
        active={showTimer}
        onComplete={handleTimerComplete}
        onSkip={handleTimerSkip}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/workouts">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              {t("workouts.focusMode")}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentIndex + 1} / {exercises.length}
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {exercises.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goToExercise(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentIndex
                  ? "bg-foreground"
                  : i === currentIndex
                  ? "bg-foreground/60"
                  : "bg-foreground/15"
              }`}
              whileTap={{ scale: 0.95 }}
            />
          ))}
        </div>

        {/* Current Exercise - Focus View */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 50 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-4"
          >
            {/* Exercise Name & Info */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{currentEx.exercise.name}</h2>
                    <p className="text-sm text-muted-foreground capitalize">
                      {currentEx.exercise.muscle_group} • {currentEx.exercise.equipment_required}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => swapExercise(currentIndex)}
                    className="h-9 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Swap
                  </Button>
                </div>

                {/* Previous Performance */}
                {currentEx.previousBest && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 rounded-xl bg-foreground/5 px-4 py-3 mt-3"
                  >
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t("workouts.lastTime")}:{" "}
                      <span className="font-semibold text-foreground">
                        {formatWeight(currentEx.previousBest.weight, units)} × {currentEx.previousBest.reps}
                      </span>
                    </span>
                  </motion.div>
                )}

                {/* Sets Progress */}
                <div className="flex items-center gap-2 mt-3">
                  <p className="text-xs text-muted-foreground">
                    {completedSets}/{totalSets} sets
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sets — Large Inputs */}
            <div className="space-y-3">
              {currentEx.sets.map((set, setIdx) => {
                const currentVolume =
                  parseFloat(set.weight || "0") * parseInt(set.reps || "0");
                const previousVolume = currentEx.previousBest
                  ? currentEx.previousBest.weight * currentEx.previousBest.reps
                  : 0;

                return (
                  <motion.div
                    key={setIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: setIdx * 0.05 }}
                  >
                    <Card className={`border-border/50 transition-all ${
                      set.completed ? "bg-foreground/5 opacity-60" : "bg-card/50"
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {/* Set Number */}
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/10 shrink-0">
                            <span className="text-sm font-bold">{setIdx + 1}</span>
                          </div>

                          {/* Weight Input */}
                          <div className="flex-1 space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {t("workouts.weight")}
                            </p>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={set.weight}
                              onChange={(e) =>
                                updateSet(currentIndex, setIdx, "weight", e.target.value)
                              }
                              className="h-14 bg-background/50 text-center text-xl font-bold"
                              disabled={set.completed}
                            />
                          </div>

                          {/* Reps Input */}
                          <div className="flex-1 space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Reps
                            </p>
                            <div className="relative">
                              <Input
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                value={set.reps}
                                onChange={(e) =>
                                  updateSet(currentIndex, setIdx, "reps", e.target.value)
                                }
                                className="h-14 bg-background/50 text-center text-xl font-bold"
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
                          </div>

                          {/* Complete Button */}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleSetComplete(currentIndex, setIdx)}
                            className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 transition-all shrink-0 ${
                              set.completed
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                                : "border-border hover:border-foreground/30"
                            }`}
                          >
                            <Check className="h-6 w-6" />
                          </motion.button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {currentIndex > 0 && (
            <Button
              variant="outline"
              className="flex-1 h-14"
              onClick={() => goToExercise(currentIndex - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("workouts.previous")}
            </Button>
          )}
          {currentIndex < exercises.length - 1 ? (
            <Button
              className="flex-1 h-14 font-bold"
              onClick={() => goToExercise(currentIndex + 1)}
            >
              {t("workouts.next")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="flex-1 h-14 text-lg font-bold"
              onClick={saveWorkout}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t("workouts.finishWorkout")} ✅
                </>
              )}
            </Button>
          )}
        </div>

        {/* Global Progress */}
        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground">
            {totalCompletedSets}/{totalTotalSets} sets {t("workouts.totalCompleted")}
          </p>
        </div>
      </div>
    </>
  );
}
