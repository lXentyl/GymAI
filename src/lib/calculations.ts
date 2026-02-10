import { type Goal, type TDEEResult } from "./types";

/**
 * Calculate TDEE using the Mifflin-St Jeor equation
 */
export function calculateTDEE(
    weightKg: number,
    heightCm: number,
    age: number,
    gender: "male" | "female" | "other",
    activityMultiplier: number = 1.55 // Moderate exercise
): TDEEResult {
    let bmr: number;

    if (gender === "male") {
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }

    const tdee = Math.round(bmr * activityMultiplier);

    return {
        bmr: Math.round(bmr),
        tdee,
        protein_g: Math.round(weightKg * 2.2), // 1g per lb
        carbs_g: Math.round((tdee * 0.4) / 4),
        fat_g: Math.round((tdee * 0.25) / 9),
    };
}

/**
 * Calculate daily water intake target in ml
 */
export function calculateWaterTarget(weightKg: number): number {
    return Math.round(weightKg * 30); // 30ml per kg
}

/**
 * Get calorie adjustment based on goal
 */
export function getCalorieAdjustment(goal: Goal, tdee: number): number {
    switch (goal) {
        case "hypertrophy":
            return Math.round(tdee * 1.1); // +10% surplus
        case "strength":
            return Math.round(tdee * 1.05); // +5% surplus
        case "weight_loss":
            return Math.round(tdee * 0.8); // -20% deficit
        default:
            return tdee;
    }
}
