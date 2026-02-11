"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "es";
export type UnitSystem = "metric" | "imperial";

interface SettingsState {
    language: Language;
    units: UnitSystem;
    setLanguage: (lang: Language) => void;
    setUnits: (units: UnitSystem) => void;
}

export const useSettings = create<SettingsState>()(
    persist(
        (set) => ({
            language: "es",
            units: "metric",
            setLanguage: (language) => set({ language }),
            setUnits: (units) => set({ units }),
        }),
        {
            name: "gymai-settings",
        }
    )
);
