"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type Profile, type Exercise, type WorkoutPlan } from "@/lib/types";
import {
  generateWorkout,
  getDayMuscleGroups,
} from "@/lib/ai-trainer";

export default function WorkoutsPage() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setPlans(data || []);
    setLoading(false);
  };

  const generateNewWorkout = async () => {
    setGenerating(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single() as { data: Profile | null };

    if (!profile) return;

    // Get user equipment
    const { data: equipment } = await supabase
      .from("equipment_inventory")
      .select("equipment_name")
      .eq("user_id", user.id);

    const userEquipment = equipment?.map((e) => e.equipment_name) || [
      "bodyweight",
    ];

    // Get exercises
    const { data: exercises } = await supabase
      .from("exercises")
      .select("*") as { data: Exercise[] | null };

    if (!exercises) return;

    // Determine day and split
    const dayIndex = plans.length % 3;
    const splitType = "push_pull_legs" as const;
    const muscleGroups = getDayMuscleGroups(splitType, dayIndex);
    const dayNames = ["Push", "Pull", "Legs"];

    // Generate workout
    const workout = generateWorkout(
      exercises,
      userEquipment,
      profile.goal || "hypertrophy",
      muscleGroups
    );

    // Save plan
    const { data: plan } = await supabase
      .from("workout_plans")
      .insert({
        user_id: user.id,
        name: `${dayNames[dayIndex % dayNames.length]} Day`,
        split_type: splitType,
        day_of_week: new Date().getDay(),
      })
      .select()
      .single();

    if (plan && workout.length > 0) {
      const planExercises = workout.map((w, i) => ({
        plan_id: plan.id,
        exercise_id: w.exercise.id,
        sets: w.sets,
        target_reps: w.reps,
        rest_seconds: w.rest,
        sort_order: i,
      }));

      await supabase.from("workout_plan_exercises").insert(planExercises);
    }

    await loadPlans();
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workouts</h1>
          <p className="text-sm text-muted-foreground">
            AI-generated for your goals
          </p>
        </div>
        <Button
          onClick={generateNewWorkout}
          disabled={generating}
          className="h-10"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Generate
            </>
          )}
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">No workouts yet</p>
              <p className="text-sm text-muted-foreground">
                Generate your first AI-powered workout
              </p>
            </div>
            <Button onClick={generateNewWorkout} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Generate Workout"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/workouts/${plan.id}`}>
              <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-all cursor-pointer group mb-3">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(plan.created_at).toLocaleDateString()} •{" "}
                          {plan.split_type?.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
