"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import Reveal from "@/components/reveal";
import { SkeletonPage } from "@/components/skeleton-card";
import MealAnalyzer from "@/components/meal-analyzer";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-store";
import { formatWater } from "@/lib/unit-converter";
import {
  Apple,
  Droplets,
  Pill,
  Plus,
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
  const { t } = useTranslation();
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

  const saveMealData = async (data: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const newCalories = (dailyStats?.calories || 0) + data.calories;
    const newProtein = (dailyStats?.protein_g || 0) + data.protein_g;
    const newCarbs = (dailyStats?.carbs_g || 0) + data.carbs_g;
    const newFat = (dailyStats?.fat_g || 0) + data.fat_g;

    await supabase.from("daily_stats").upsert(
      {
        user_id: user.id,
        date: today,
        calories: newCalories,
        protein_g: newProtein,
        carbs_g: newCarbs,
        fat_g: newFat,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );

    setDailyStats((prev) =>
      prev
        ? {
            ...prev,
            calories: newCalories,
            protein_g: newProtein,
            carbs_g: newCarbs,
            fat_g: newFat,
          }
        : prev
    );
  };

  const addWater = async (amount: number = 250) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newAmount = (dailyStats?.water_ml || 0) + amount;
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
    : 2800;

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <Reveal delay={0}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("nutrition.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("nutrition.subtitle")}
          </p>
        </div>
      </Reveal>

      <Tabs defaultValue="calories" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-11">
          <TabsTrigger value="calories" className="text-xs">
            <Apple className="h-3.5 w-3.5 mr-1" />
            {t("nutrition.calories")}
          </TabsTrigger>
          <TabsTrigger value="water" className="text-xs">
            <Droplets className="h-3.5 w-3.5 mr-1" />
            {t("nutrition.water")}
          </TabsTrigger>
          <TabsTrigger value="supplements" className="text-xs">
            <Pill className="h-3.5 w-3.5 mr-1" />
            {t("nutrition.supps")}
          </TabsTrigger>
        </TabsList>

        {/* Calories Tab */}
        <TabsContent value="calories" className="space-y-4 mt-4">
          {tdee && (
            <Reveal delay={0.1}>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold">
                    {t("nutrition.tdeeSummary")}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("nutrition.bmr")}
                      </p>
                      <p className="font-bold">{tdee.bmr} kcal</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("nutrition.target")}
                      </p>
                      <p className="font-bold">{adjustedCalories} kcal</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("nutrition.protein")}
                      </p>
                      <p className="font-bold">{tdee.protein_g}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("nutrition.carbs")}
                      </p>
                      <p className="font-bold">{tdee.carbs_g}g</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          )}

          <MealAnalyzer onSave={saveMealData} />

          {adjustedCalories > 0 && (dailyStats?.calories || 0) > 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 space-y-2">
                <Progress
                  value={Math.min(
                    ((dailyStats?.calories || 0) / adjustedCalories) * 100,
                    100
                  )}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{dailyStats?.calories || 0} kcal</span>
                  <span>{adjustedCalories} kcal {t("nutrition.target").toLowerCase()}</span>
                </div>
                {(dailyStats?.protein_g || 0) > 0 && (
                  <div className="flex gap-4 text-xs text-muted-foreground justify-center pt-1">
                    <span>P: {dailyStats?.protein_g || 0}g</span>
                    <span>C: {dailyStats?.carbs_g || 0}g</span>
                    <span>F: {dailyStats?.fat_g || 0}g</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Water Tab */}
        <TabsContent value="water" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-5 space-y-4 text-center">
              <Droplets className="h-10 w-10 mx-auto text-blue-400" />
              <div>
                <p className="text-3xl font-black">
                  {formatWater(dailyStats?.water_ml || 0, units)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("nutrition.ofTarget", { target: formatWater(waterTarget, units) })}
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
                    onClick={() => addWater(amount)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {formatWater(amount, units)}
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
              <p className="text-sm font-semibold">
                {t("nutrition.addSupplement")}
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder={t("nutrition.name")}
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="h-10 bg-background/50"
                />
                <Input
                  placeholder={t("nutrition.dosage")}
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
                {t("nutrition.noSupplements")}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
