"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Reveal from "@/components/reveal";
import { SkeletonPage } from "@/components/skeleton-card";
import { MotionCard } from "@/components/motion-primitives";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-store";
import { formatWeight, formatHeight, kgToLbs, lbsToKg, cmToFtIn } from "@/lib/unit-converter";
import {
  User,
  Flame,
  Trophy,
  Edit3,
  Save,
  LogOut,
  Settings,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";
import { type Profile } from "@/lib/types";

const EQUIPMENT_OPTIONS = [
  "barbell",
  "dumbbells",
  "cables",
  "machines",
  "bodyweight",
  "bands",
  "kettlebell",
  "pull_up_bar",
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const { t } = useTranslation();
  const units = useSettings((s) => s.units);

  useEffect(() => {
    loadProfile();
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
      // Display in user's preferred units
      if (data.weight_kg) {
        setEditWeight(
          units === "imperial"
            ? String(kgToLbs(data.weight_kg))
            : String(data.weight_kg)
        );
      }
      if (data.height_cm) {
        if (units === "imperial") {
          const { ft, inches } = cmToFtIn(data.height_cm);
          setEditHeight(`${ft}'${inches}"`);
        } else {
          setEditHeight(String(data.height_cm));
        }
      }
    }
    setLoading(false);
  };

  const saveStats = async () => {
    if (!profile) return;
    const supabase = createClient();

    // Convert display values back to metric for DB storage
    let weightKg: number | undefined;
    let heightCm: number | undefined;

    if (editWeight) {
      weightKg =
        units === "imperial"
          ? lbsToKg(parseFloat(editWeight))
          : parseFloat(editWeight);
    }
    if (editHeight) {
      if (units === "imperial") {
        // Parse ft'in" format
        const match = editHeight.match(/(\d+)'(\d+)/);
        if (match) {
          heightCm = Math.round((parseInt(match[1]) * 12 + parseInt(match[2])) * 2.54);
        }
      } else {
        heightCm = parseFloat(editHeight);
      }
    }

    await supabase
      .from("profiles")
      .update({
        weight_kg: weightKg,
        height_cm: heightCm,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setProfile((p) =>
      p ? { ...p, weight_kg: weightKg || p.weight_kg, height_cm: heightCm || p.height_cm } : p
    );
    setEditing(false);
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleEquipment = async (eq: string) => {
    if (!profile) return;
    const supabase = createClient();
    const current = profile.equipment || [];
    const updated = current.includes(eq)
      ? current.filter((e: string) => e !== eq)
      : [...current, eq];

    await supabase
      .from("profiles")
      .update({ equipment: updated, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    setProfile((p) => (p ? { ...p, equipment: updated } : p));
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Reveal delay={0}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("profile.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("profile.subtitle")}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
        </div>
      </Reveal>

      {/* Name + Info */}
      <Reveal delay={0.1}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5 text-center space-y-1">
            <p className="text-xl font-bold">{profile?.full_name || "Athlete"}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile?.goal?.replace("_", " ") || t("general.notSet")} •{" "}
              {profile?.body_type || t("general.notSet")}
            </p>
          </CardContent>
        </Card>
      </Reveal>

      {/* Body Stats */}
      <Reveal delay={0.2}>
        <MotionCard glow>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t("profile.bodyStats")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (editing ? saveStats() : setEditing(true))}
                >
                  {editing ? (
                    <>
                      <Save className="h-4 w-4 mr-1" /> {t("profile.save")}
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4 mr-1" /> {t("profile.edit")}
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-foreground/5 p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("profile.weight")}
                  </p>
                  {editing ? (
                    <Input
                      type="number"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      className="mt-1 text-center h-8 text-sm"
                      placeholder={units === "imperial" ? "lbs" : "kg"}
                    />
                  ) : (
                    <p className="text-lg font-black tabular-nums">
                      {profile?.weight_kg
                        ? formatWeight(profile.weight_kg, units)
                        : t("general.notSet")}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-foreground/5 p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("profile.height")}
                  </p>
                  {editing ? (
                    <Input
                      type="text"
                      value={editHeight}
                      onChange={(e) => setEditHeight(e.target.value)}
                      className="mt-1 text-center h-8 text-sm"
                      placeholder={units === "imperial" ? "5'11\"" : "cm"}
                    />
                  ) : (
                    <p className="text-lg font-black tabular-nums">
                      {profile?.height_cm
                        ? formatHeight(profile.height_cm, units)
                        : t("general.notSet")}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-foreground/5 p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("profile.age")}
                  </p>
                  <p className="text-lg font-black tabular-nums">
                    {profile?.age || t("general.notSet")}
                  </p>
                </div>
                <div className="rounded-xl bg-foreground/5 p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("profile.gender")}
                  </p>
                  <p className="text-lg font-black tabular-nums capitalize">
                    {profile?.gender || t("general.notSet")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionCard>
      </Reveal>

      {/* Achievements */}
      <Reveal delay={0.3}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5 space-y-3">
            <p className="font-semibold">{t("profile.achievements")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-foreground/5 p-3">
                <Flame className="h-6 w-6 text-orange-400" />
                <div>
                  <p className="text-lg font-black">{profile?.current_streak || 0}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("profile.currentStreak")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-foreground/5 p-3">
                <Trophy className="h-6 w-6 text-yellow-400" />
                <div>
                  <p className="text-lg font-black">{profile?.longest_streak || 0}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("profile.bestStreak")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Equipment */}
      <Reveal delay={0.4}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">{t("profile.equipment")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const isActive = profile?.equipment?.includes(eq);
                return (
                  <button
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`rounded-full px-4 py-2 text-xs font-medium border-2 transition-all capitalize ${
                      isActive
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    {eq.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Actions */}
      <Reveal delay={0.5}>
        <div className="space-y-3">
          <Link href="/settings">
            <Button variant="outline" className="w-full h-12">
              <Settings className="h-4 w-4 mr-2" />
              {t("profile.settings")}
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full h-12 text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("profile.signOut")}
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
