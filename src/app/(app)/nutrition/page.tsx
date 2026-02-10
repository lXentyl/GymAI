"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Apple,
  Droplets,
  Pill,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { type Profile, type Supplement, type DailyStats } from "@/lib/types";
import {
  calculateTDEE,
  calculateWaterTarget,
  getCalorieAdjustment,
} from "@/lib/calculations";

export default function NutritionPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [supplementsTaken, setSupplementsTaken] = useState<Record<string, boolean>>({});
  const [newSupName, setNewSupName] = useState("");
  const [newSupDosage, setNewSupDosage] = useState("");
  const [loading, setLoading] = useState(true);
  const [calories, setCalories] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, statsRes, supRes, supLogRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("daily_stats")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", new Date().toISOString().split("T")[0])
        .single(),
      supabase.from("supplements").select("*").eq("user_id", user.id),
      supabase
        .from("supplement_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", new Date().toISOString().split("T")[0]),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (statsRes.data) {
      setDailyStats(statsRes.data);
      setCalories(statsRes.data.calories?.toString() || "");
    }
    if (supRes.data) setSupplements(supRes.data);
    if (supLogRes.data) {
      const taken: Record<string, boolean> = {};
      supLogRes.data.forEach((log) => {
        taken[log.supplement_id] = log.taken;
      });
      setSupplementsTaken(taken);
    }

    setLoading(false);
  };

  const logCalories = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("daily_stats").upsert(
      {
        user_id: user.id,
        date: today,
        calories: parseFloat(calories) || 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );
  };

  const addWater = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newAmount = (dailyStats?.water_ml || 0) + 250;
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

    setDailyStats((prev) => (prev ? { ...prev, water_ml: newAmount } : prev));
  };

  const addSupplement = async () => {
    if (!newSupName) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("supplements")
      .insert({
        user_id: user.id,
        name: newSupName,
        dosage: newSupDosage || null,
      })
      .select()
      .single();

    if (data) {
      setSupplements((prev) => [...prev, data]);
      setNewSupName("");
      setNewSupDosage("");
    }
  };

  const deleteSupplement = async (supId: string) => {
    const supabase = createClient();
    await supabase.from("supplements").delete().eq("id", supId);
    setSupplements((prev) => prev.filter((s) => s.id !== supId));
  };

  const toggleSupplement = async (supId: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newValue = !supplementsTaken[supId];
    setSupplementsTaken((prev) => ({ ...prev, [supId]: newValue }));

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("supplement_logs").upsert(
      {
        user_id: user.id,
        supplement_id: supId,
        date: today,
        taken: newValue,
      },
      { onConflict: "user_id,supplement_id,date" }
    );
  };

  // Calculate TDEE
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
  const waterTarget = profile?.weight_kg
    ? calculateWaterTarget(profile.weight_kg)
    : 2400;

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
        <h1 className="text-2xl font-bold tracking-tight">Nutrition</h1>
        <p className="text-sm text-muted-foreground">
          Track your daily intake
        </p>
      </div>

      <Tabs defaultValue="calories" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-11">
          <TabsTrigger value="calories" className="text-xs">
            <Apple className="h-3.5 w-3.5 mr-1" />
            Calories
          </TabsTrigger>
          <TabsTrigger value="water" className="text-xs">
            <Droplets className="h-3.5 w-3.5 mr-1" />
            Water
          </TabsTrigger>
          <TabsTrigger value="supplements" className="text-xs">
            <Pill className="h-3.5 w-3.5 mr-1" />
            Supps
          </TabsTrigger>
        </TabsList>

        {/* Calories Tab */}
        <TabsContent value="calories" className="space-y-4 mt-4">
          {tdee && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">TDEE Summary</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">BMR</p>
                    <p className="font-bold">{tdee.bmr} kcal</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="font-bold">{adjustedCalories} kcal</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="font-bold">{tdee.protein_g}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="font-bold">{tdee.carbs_g}g</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 space-y-3">
              <Label>Log Calories Today</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 2200"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="h-12 bg-background/50"
                />
                <Button onClick={logCalories} className="h-12 px-6">
                  Save
                </Button>
              </div>
              {adjustedCalories > 0 && calories && (
                <Progress
                  value={Math.min(
                    (parseFloat(calories) / adjustedCalories) * 100,
                    100
                  )}
                  className="h-2"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Water Tab */}
        <TabsContent value="water" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-5 space-y-4 text-center">
              <Droplets className="h-10 w-10 mx-auto text-blue-400" />
              <div>
                <p className="text-3xl font-black">
                  {dailyStats?.water_ml || 0}
                  <span className="text-lg text-muted-foreground ml-1">ml</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  of {waterTarget}ml target
                </p>
              </div>
              <Progress
                value={Math.min(
                  ((dailyStats?.water_ml || 0) / waterTarget) * 100,
                  100
                )}
                className="h-3"
              />
              <div className="flex justify-center gap-3 flex-wrap">
                {[250, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-12 min-w-[100px]"
                    onClick={addWater}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {amount}ml
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplements Tab */}
        <TabsContent value="supplements" className="space-y-4 mt-4">
          {/* Add new supplement */}
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Add Supplement</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="h-10 bg-background/50"
                />
                <Input
                  placeholder="Dosage"
                  value={newSupDosage}
                  onChange={(e) => setNewSupDosage(e.target.value)}
                  className="h-10 bg-background/50 w-24"
                />
                <Button size="sm" className="h-10" onClick={addSupplement}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Supplement list */}
          <div className="space-y-2">
            {supplements.map((sup) => (
              <Card key={sup.id} className="border-border/50 bg-card/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={supplementsTaken[sup.id] || false}
                      onCheckedChange={() => toggleSupplement(sup.id)}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          supplementsTaken[sup.id]
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {sup.name}
                      </p>
                      {sup.dosage && (
                        <p className="text-xs text-muted-foreground">
                          {sup.dosage}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      onClick={() => deleteSupplement(sup.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {supplements.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No supplements added yet
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
