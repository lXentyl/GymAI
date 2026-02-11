"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Reveal from "@/components/reveal";
import { Dumbbell, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError(t("auth.passwordMinError"));
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Sign up — with email confirmation disabled, this returns a session immediately
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    // If we got a session (email confirmation disabled), go straight to onboarding
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    // If no session but user exists (email confirmation enabled, or already registered)
    if (data.user && !data.session) {
      // User already exists — try login instead
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(translateAuthError(loginError.message));
        setLoading(false);
        return;
      }

      router.push("/onboarding");
      router.refresh();
      return;
    }

    // Fallback: just redirect to onboarding
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Reveal delay={0}>
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground">
            <Dumbbell className="h-7 w-7 text-background" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("auth.joinGymAI")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.startJourney")}
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-center">
              {t("auth.createAccount")}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.minChars")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-background/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("auth.createAccount")
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.haveAccount")}{" "}
              <Link
                href="/login"
                className="text-foreground underline-offset-4 hover:underline font-medium"
              >
                {t("auth.signInLink")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
