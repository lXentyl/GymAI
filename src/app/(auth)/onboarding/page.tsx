"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Ruler,
  Target,
  Dumbbell,
  User,
} from "lucide-react";

const BODY_TYPES = [
  {
    value: "ectomorph",
    label: "Ectomorph",
    desc: "Lean, long limbs, fast metabolism",
    emoji: "🏃",
  },
  {
    value: "mesomorph",
    label: "Mesomorph",
    desc: "Athletic, muscular build, medium frame",
    emoji: "💪",
  },
  {
    value: "endomorph",
    label: "Endomorph",
    desc: "Wider build, stores fat easily, strong",
    emoji: "🏋️",
  },
];

const GOALS = [
  {
    value: "hypertrophy",
    label: "Hypertrophy",
    desc: "Maximize muscle size and volume",
    emoji: "💪",
  },
  {
    value: "strength",
    label: "Strength",
    desc: "Lift heavier, get stronger",
    emoji: "🏆",
  },
  {
    value: "weight_loss",
    label: "Weight Loss",
    desc: "Burn fat, improve conditioning",
    emoji: "🔥",
  },
];

const EQUIPMENT_OPTIONS = [
  { name: "Barbell", category: "free_weights" },
  { name: "Dumbbells", category: "free_weights" },
  { name: "Kettlebell", category: "free_weights" },
  { name: "Cable Machine", category: "cables" },
  { name: "Smith Machine", category: "machines" },
  { name: "Leg Press", category: "machines" },
  { name: "Lat Pulldown", category: "machines" },
  { name: "Chest Press Machine", category: "machines" },
  { name: "Leg Curl Machine", category: "machines" },
  { name: "Leg Extension Machine", category: "machines" },
  { name: "Pull-up Bar", category: "bodyweight" },
  { name: "Resistance Bands", category: "accessories" },
  { name: "Bench (Flat/Incline)", category: "accessories" },
  { name: "Treadmill", category: "cardio" },
  { name: "Bodyweight Only", category: "bodyweight" },
];

const STEPS = [
  { icon: Ruler, title: "Body Metrics" },
  { icon: User, title: "Body Type" },
  { icon: Target, title: "Your Goal" },
  { icon: Dumbbell, title: "Equipment" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form state
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string>("");
  const [bodyType, setBodyType] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  const toggleEquipment = (name: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return height && weight && age && gender;
      case 1:
        return bodyType;
      case 2:
        return goal;
      case 3:
        return selectedEquipment.length > 0;
      default:
        return false;
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({
          height_cm: parseFloat(height),
          weight_kg: parseFloat(weight),
          age: parseInt(age),
          gender,
          body_type: bodyType,
          goal,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Insert equipment
      const equipmentRows = selectedEquipment.map((name) => {
        const found = EQUIPMENT_OPTIONS.find((e) => e.name === name);
        return {
          user_id: user.id,
          equipment_name: name,
          category: found?.category || "accessories",
        };
      });

      await supabase.from("equipment_inventory").insert(equipmentRows);

      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  i <= step
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground"
                }`}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                {s.title}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          {/* Step 0: Biometrics */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Body Metrics</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Help us customize your experience
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="h-12 bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="75"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="h-12 bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="h-12 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["male", "female", "other"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`h-12 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                        gender === g
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Body Type */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Body Type</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the body type closest to yours
                </p>
              </div>

              <div className="space-y-3">
                {BODY_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => setBodyType(bt.value)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      bodyType === bt.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{bt.emoji}</span>
                      <div>
                        <p className="font-semibold">{bt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {bt.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Goal */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Your Goal</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  What are you training for?
                </p>
              </div>

              <div className="space-y-3">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      goal === g.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.emoji}</span>
                      <div>
                        <p className="font-semibold">{g.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Equipment */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Your Equipment</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select everything available at your gym
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <label
                    key={eq.name}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${
                      selectedEquipment.includes(eq.name)
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedEquipment.includes(eq.name)}
                      onCheckedChange={() => toggleEquipment(eq.name)}
                    />
                    <span className="text-sm font-medium">{eq.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground capitalize">
                      {eq.category.replace("_", " ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}

        {step < 3 ? (
          <Button
            className="flex-1 h-12 font-semibold"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="flex-1 h-12 font-semibold"
            onClick={handleComplete}
            disabled={!canProceed() || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Start Training 🚀"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
