import { type UnitSystem } from "./settings-store";

// --- Weight ---
export function kgToLbs(kg: number): number {
    return Math.round(kg * 2.20462 * 10) / 10;
}
export function lbsToKg(lbs: number): number {
    return Math.round(lbs / 2.20462 * 10) / 10;
}

// --- Height ---
export function cmToFtIn(cm: number): { ft: number; inches: number } {
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { ft, inches };
}
export function ftInToCm(ft: number, inches: number): number {
    return Math.round((ft * 12 + inches) * 2.54);
}

// --- Water ---
export function mlToOz(ml: number): number {
    return Math.round(ml / 29.5735 * 10) / 10;
}
export function ozToMl(oz: number): number {
    return Math.round(oz * 29.5735);
}

// --- Formatted display ---
export function formatWeight(kg: number, units: UnitSystem): string {
    if (units === "imperial") return `${kgToLbs(kg)} lbs`;
    return `${kg} kg`;
}

export function formatHeight(cm: number, units: UnitSystem): string {
    if (units === "imperial") {
        const { ft, inches } = cmToFtIn(cm);
        return `${ft}'${inches}"`;
    }
    return `${cm} cm`;
}

export function formatWater(ml: number, units: UnitSystem): string {
    if (units === "imperial") return `${mlToOz(ml)} oz`;
    return `${ml} ml`;
}

export function formatWeightUnit(units: UnitSystem): string {
    return units === "imperial" ? "lbs" : "kg";
}

export function formatHeightUnit(units: UnitSystem): string {
    return units === "imperial" ? "ft/in" : "cm";
}

export function formatWaterUnit(units: UnitSystem): string {
    return units === "imperial" ? "oz" : "ml";
}

/** Convert displayed value back to metric for DB storage */
export function displayWeightToKg(value: number, units: UnitSystem): number {
    return units === "imperial" ? lbsToKg(value) : value;
}
export function displayHeightToCm(value: number, units: UnitSystem): number {
    // For imperial, the input field should handle ft/in separately
    return value;
}
