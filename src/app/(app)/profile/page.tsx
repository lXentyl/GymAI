"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  LogOut,
  User,
  Ruler,
  Target,
  Dumbbell,
  Award,
} from "lucide-react";
import { type Profile, type Equipment } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, equipRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("equipment_inventory")
        .select("*")
        .eq("user_id", user.id),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setEditWeight(profileRes.data.weight_kg?.toString() || "");
      setEditHeight(profileRes.data.height_cm?.toString() || "");
    }
    if (equipRes.data) setEquipment(equipRes.data);

    setLoading(false);
  };

  const saveProfile = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        weight_kg: parseFloat(editWeight) || null,
        height_cm: parseFloat(editHeight) || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setEditing(false);
    loadData();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your settings
        </p>
      </div>

      {/* User Info */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background">
              <User className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {profile?.full_name || "Athlete"}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile?.body_type} • {profile?.goal?.replace("_", " ")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Body Stats</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (editing ? saveProfile() : setEditing(true))}
            >
              {editing ? "Save" : "Edit"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">
                  Height
                </Label>
              </div>
              {editing ? (
                <Input
                  type="number"
                  value={editHeight}
                  onChange={(e) => setEditHeight(e.target.value)}
                  className="h-10 bg-background/50"
                />
              ) : (
                <p className="text-lg font-bold">
                  {profile?.height_cm || "—"}
                  <span className="text-sm text-muted-foreground ml-1">
                    cm
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">
                  Weight
                </Label>
              </div>
              {editing ? (
                <Input
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  className="h-10 bg-background/50"
                />
              ) : (
                <p className="text-lg font-bold">
                  {profile?.weight_kg || "—"}
                  <span className="text-sm text-muted-foreground ml-1">
                    kg
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Age</p>
              <p className="font-bold">{profile?.age || "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Gender</p>
              <p className="font-bold capitalize">
                {profile?.gender || "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Unit</p>
              <p className="font-bold capitalize">
                {profile?.unit_system || "metric"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streaks */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-orange-400" />
            <p className="font-semibold">Achievements</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-foreground/5 p-3 text-center">
              <p className="text-2xl font-black">
                {profile?.current_streak || 0}
              </p>
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
            <div className="rounded-xl bg-foreground/5 p-3 text-center">
              <p className="text-2xl font-black">
                {profile?.longest_streak || 0}
              </p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Equipment</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {equipment.map((eq) => (
              <span
                key={eq.id}
                className="rounded-full border border-border bg-foreground/5 px-3 py-1 text-xs"
              >
                {eq.equipment_name}
              </span>
            ))}
            {equipment.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No equipment saved
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-border/50" />

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-12 text-red-400 border-red-400/20 hover:bg-red-400/10"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
