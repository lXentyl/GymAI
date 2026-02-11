"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/reveal";
import { SkeletonPage } from "@/components/skeleton-card";
import { MotionCard } from "@/components/motion-primitives";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-store";
import { formatWeight } from "@/lib/unit-converter";
import { Dumbbell, Loader2, ChevronRight } from "lucide-react";
import { type Profile, type Exercise, type WorkoutPlan } from "@/lib/types";
import { generateWorkout, getDayMuscleGroups } from "@/lib/ai-trainer";
import { toast } from "sonner";

export default function WorkoutsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const { t } = useTranslation();
  const units = useSettings((s) => s.units);

  useEffect(() => {
    setDayOfWeek(new Date().getDay());
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: profileData }, { data: exerciseData }, { data: planData }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("exercises").select("*"),
        supabase
          .from("workout_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (profileData) setProfile(profileData);
    if (exerciseData) setExercises(exerciseData);
    if (planData) setCurrentPlan(planData);
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!profile || exercises.length === 0) return;
    setGenerating(true);

    const muscleGroups = getDayMuscleGroups("push_pull_legs", dayOfWeek);
    const goal = profile.goal || "hypertrophy";
    const userEquipment = profile.equipment || ["bodyweight"];

    const workout = generateWorkout(
      exercises,
      userEquipment,
      goal,
      muscleGroups,
      2
    );

    // Save to DB
    const supabase = createClient();
    const plan = {
      user_id: profile.id,
      name: `${muscleGroups.join(" / ")} Day`,
      exercises: workout.map((w) => ({
        exercise_id: w.exercise.id,
        name: w.exercise.name,
        sets: w.sets,
        reps: w.reps,
        rest_seconds: w.rest,
        equipment: w.exercise.equipment,
        muscle_group: w.exercise.muscle_group,
      })),
      created_at: new Date().toISOString(),
    };

    const { data } = await supabase
      .from("workout_plans")
      .insert(plan)
      .select()
      .single();

    if (data) {
      setCurrentPlan(data);
      toast.success(t("toast.workoutGenerated"));
    }
    setGenerating(false);
  };

  const todayMuscles = getDayMuscleGroups("push_pull_legs", dayOfWeek);

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Reveal delay={0}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("workouts.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("workouts.subtitle")}
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || exercises.length === 0}
            size="sm"
            className="gap-1"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Dumbbell className="h-4 w-4" />
            )}
            {t("workouts.generate")}
          </Button>
        </div>
      </Reveal>

      {/* Today's Focus */}
      <Reveal delay={0.1}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("workouts.todaysFocus")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {todayMuscles.map((mg) => (
                <span
                  key={mg}
                  className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium capitalize"
                >
                  {mg}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Current Workout Plan */}
      {currentPlan && currentPlan.exercises ? (
        <Reveal delay={0.2}>
          <div className="space-y-3">
            <p className="text-sm font-semibold">{currentPlan.name}</p>
            {(currentPlan.exercises as Array<{
              exercise_id: string;
              name: string;
              sets: number;
              reps: number;
              rest_seconds: number;
              equipment: string;
              muscle_group: string;
            }>).map((ex, i) => (
              <MotionCard key={i} glow>
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{ex.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {ex.muscle_group} • {ex.equipment}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums">
                          {ex.sets} × {ex.reps}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ex.rest_seconds}s {t("workouts.rest")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </MotionCard>
            ))}
          </div>
        </Reveal>
      ) : (
        <Reveal delay={0.2}>
          <MotionCard glow>
            <Card className="border-border/50 bg-card/50 border-dashed">
              <CardContent className="p-10 text-center space-y-4">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-foreground/5">
                  <Dumbbell className="h-8 w-8 text-muted-foreground animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{t("workouts.noWorkouts")}</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {t("workouts.noWorkouts.sub")}
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || exercises.length === 0}
                  size="lg"
                  className="mt-2 gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Dumbbell className="h-4 w-4" />
                  )}
                  {t("workouts.generateWorkout")}
                </Button>
              </CardContent>
            </Card>
          </MotionCard>
        </Reveal>
      )}
    </div>
  );
}
