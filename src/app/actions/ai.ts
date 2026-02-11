"use server";

import { z } from "zod";
import { openai, AI_MODEL } from "@/lib/ai";

// ─── Schemas ────────────────────────────────────────────────────────────────

const MealAnalysisSchema = z.object({
    calories: z.number().int().nonnegative(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fats: z.number().nonnegative(),
    summary: z.string().min(1).max(80),
});

export type MealAnalysis = z.infer<typeof MealAnalysisSchema>;

const AdaptedExerciseSchema = z.object({
    name: z.string(),
    muscle_group: z.string(),
    equipment: z.string(),
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),
    rest_seconds: z.number().int().positive(),
    is_superset_with: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
});

const AdaptedWorkoutSchema = z.object({
    exercises: z.array(AdaptedExerciseSchema),
    message: z.string(),
});

export type AdaptedExercise = z.infer<typeof AdaptedExerciseSchema>;
export type AdaptedWorkout = z.infer<typeof AdaptedWorkoutSchema>;

export type UserCondition = "great" | "tired" | "short_on_time" | "injured";

// ─── Analyze Meal ───────────────────────────────────────────────────────────

export async function analyzeMeal(
    description: string
): Promise<
    | { success: true; data: MealAnalysis }
    | { success: false; error: string }
> {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: "AI is not configured. Please use manual input." };
    }

    if (!description.trim()) {
        return { success: false, error: "Please describe your meal." };
    }

    try {
        const response = await openai.chat.completions.create({
            model: AI_MODEL,
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an expert nutritionist. Analyze the user's meal description. Return a strict JSON object with these exact fields:
- calories (integer, total estimated calories)
- protein (number, grams of protein)  
- carbs (number, grams of carbohydrates)
- fats (number, grams of fat)
- summary (string, short display name for the meal, max 60 chars)

Be conservative with estimates. If the description is vague, estimate based on typical serving sizes. Always return valid JSON, nothing else.`,
                },
                {
                    role: "user",
                    content: description,
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return { success: false, error: "AI returned an empty response." };
        }

        const parsed = JSON.parse(content);
        const validated = MealAnalysisSchema.parse(parsed);

        return { success: true, data: validated };
    } catch (error) {
        console.error("[AI] analyzeMeal error:", error);

        if (error instanceof z.ZodError) {
            return { success: false, error: "AI returned invalid data. Please try again or use manual input." };
        }

        return { success: false, error: "AI analysis failed. Please try again or use manual input." };
    }
}

// ─── Adapt Workout ──────────────────────────────────────────────────────────

interface WorkoutExercise {
    exercise_id?: string;
    name: string;
    muscle_group: string;
    equipment: string;
    sets: number;
    reps: number;
    rest_seconds: number;
}

export async function adaptWorkout(
    condition: UserCondition,
    exercises: WorkoutExercise[],
    injuryDescription?: string
): Promise<
    | { success: true; data: AdaptedWorkout }
    | { success: false; error: string }
> {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: "AI is not configured." };
    }

    // If "great", no AI needed — return exercises as-is
    if (condition === "great") {
        return {
            success: true,
            data: {
                exercises: exercises.map((ex) => ({
                    name: ex.name,
                    muscle_group: ex.muscle_group,
                    equipment: ex.equipment,
                    sets: ex.sets,
                    reps: ex.reps,
                    rest_seconds: ex.rest_seconds,
                })),
                message: "Standard workout — let's go! 💪",
            },
        };
    }

    const conditionInstructions: Record<string, string> = {
        tired: `The user is feeling TIRED today. Modify the workout:
- Reduce the number of sets by 1-2 per exercise (minimum 2 sets)
- Keep the same weight/intensity (don't reduce reps)
- Keep rest periods the same or slightly increase them
- Keep all the same exercises`,

        short_on_time: `The user is SHORT ON TIME and wants to finish in ~30 minutes. Modify the workout:
- Create superset pairings where possible (pair opposing muscle groups)
- Reduce rest periods to 45-60 seconds
- Keep 3 sets per exercise
- Use the "is_superset_with" field to indicate superset partners (use the exercise name)
- Keep all the same exercises but reorganize for efficiency`,

        injured: `The user has reported an INJURY: "${injuryDescription || "unspecified"}". 
CRITICAL SAFETY RULES:
- Remove any exercise that could aggravate the injured area
- Replace removed exercises with safe alternatives for the same or nearby muscle group
- Use the "note" field to explain why an exercise was replaced
- If the injury involves shoulders: remove overhead presses, lateral raises, and upright rows
- If the injury involves back: remove deadlifts, bent-over rows
- If the injury involves knees: remove squats, lunges, leg press
- Prefer machine or cable alternatives which are generally safer
- Reduce intensity slightly (1 fewer set per exercise)`,
    };

    try {
        const response = await openai.chat.completions.create({
            model: AI_MODEL,
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an expert personal trainer and exercise physiologist. You will receive a workout plan and a condition modifier. Adapt the workout accordingly.

${conditionInstructions[condition]}

Return a JSON object with:
- exercises: array of objects with { name, muscle_group, equipment, sets, reps, rest_seconds, is_superset_with (string|null), note (string|null) }
- message: a short motivational message about the adapted workout (max 100 chars)

Always return valid JSON, nothing else.`,
                },
                {
                    role: "user",
                    content: `Current workout plan:\n${JSON.stringify(exercises, null, 2)}`,
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return { success: false, error: "AI returned an empty response." };
        }

        const parsed = JSON.parse(content);
        const validated = AdaptedWorkoutSchema.parse(parsed);

        return { success: true, data: validated };
    } catch (error) {
        console.error("[AI] adaptWorkout error:", error);

        if (error instanceof z.ZodError) {
            return { success: false, error: "AI returned invalid workout data." };
        }

        return { success: false, error: "Workout adaptation failed. Using standard plan." };
    }
}
