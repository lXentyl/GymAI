"use client";

import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sun,
    Moon,
    Monitor,
    Globe,
    Ruler,
    ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { useSettings } from "@/lib/settings-store";
import { useTranslation } from "@/lib/i18n";
import Reveal from "@/components/reveal";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { language, units, setLanguage, setUnits } = useSettings();
    const { t } = useTranslation();

    const themeOptions = [
        { value: "system", label: t("settings.system"), icon: Monitor },
        { value: "dark", label: t("settings.dark"), icon: Moon },
        { value: "light", label: t("settings.light"), icon: Sun },
    ];

    return (
        <div className="space-y-6">
            <Reveal delay={0}>
                <div className="flex items-center gap-3">
                    <Link href="/profile">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t("settings.title")}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t("settings.subtitle")}
                        </p>
                    </div>
                </div>
            </Reveal>

            {/* Appearance / Theme */}
            <Reveal delay={0.1}>
                <Card className="border-border/50 bg-card/50">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">{t("settings.theme")}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {themeOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setTheme(opt.value)}
                                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                                        theme === opt.value
                                            ? "border-foreground bg-foreground/5"
                                            : "border-border hover:border-foreground/30"
                                    }`}
                                >
                                    <opt.icon className="h-5 w-5" />
                                    <span className="text-xs font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </Reveal>

            {/* Language */}
            <Reveal delay={0.2}>
                <Card className="border-border/50 bg-card/50">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">{t("settings.language")}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: "en" as const, label: t("settings.english") },
                                { value: "es" as const, label: t("settings.spanish") },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setLanguage(opt.value)}
                                    className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                                        language === opt.value
                                            ? "border-foreground bg-foreground/5"
                                            : "border-border hover:border-foreground/30"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </Reveal>

            {/* Units */}
            <Reveal delay={0.3}>
                <Card className="border-border/50 bg-card/50">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <Ruler className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">{t("settings.units")}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: "metric" as const, label: t("settings.metric") },
                                { value: "imperial" as const, label: t("settings.imperial") },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setUnits(opt.value)}
                                    className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                                        units === opt.value
                                            ? "border-foreground bg-foreground/5"
                                            : "border-border hover:border-foreground/30"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </Reveal>

            <Separator className="bg-border/50" />

            <Reveal delay={0.35}>
                <p className="text-center text-xs text-muted-foreground">
                    GymAI v1.0 — {t("footer.poweredBy")}{" "}
                    <span className="font-medium text-foreground/60">
                        ZyntexSolutions
                    </span>
                </p>
            </Reveal>
        </div>
    );
}
