export type Gender = "male" | "female" | "other";
export type BodyType = "ectomorph" | "mesomorph" | "endomorph";
export type Goal = "hypertrophy" | "strength" | "weight_loss";
export type UnitSystem = "metric" | "imperial";
export type EquipmentCategory = "free_weights" | "machines" | "cables" | "bodyweight" | "cardio" | "accessories";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ExerciseType = "compound" | "isolation";
export type SplitType = "push_pull_legs" | "upper_lower" | "full_body" | "custom";
export type SupplementTime = "morning" | "afternoon" | "evening" | "pre_workout" | "post_workout";

export interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    age: number | null;
    gender: Gender | null;
    body_type: BodyType | null;
    goal: Goal | null;
    unit_system: UnitSystem;
    current_streak: number;
    longest_streak: number;
    equipment?: string[];
    onboarding_completed: boolean;
    created_at: string;
    updated_at: string;
}

export interface Equipment {
    id: string;
    user_id: string;
    equipment_name: string;
    category: EquipmentCategory;
    created_at: string;
}

export interface Exercise {
    id: string;
    name: string;
    muscle_group: string;
    secondary_muscles: string[];
    equipment_required: string;
    equipment?: string;
    difficulty: Difficulty;
    exercise_type: ExerciseType;
    instructions: string | null;
    created_at: string;
}

export interface WorkoutPlan {
    id: string;
    user_id: string;
    name: string;
    split_type: SplitType;
    day_of_week: number | null;
    is_active: boolean;
    exercises?: unknown;
    created_at: string;
}

export interface WorkoutPlanExercise {
    id: string;
    plan_id: string;
    exercise_id: string;
    exercise?: Exercise;
    sets: number;
    target_reps: number;
    rest_seconds: number;
    sort_order: number;
    created_at: string;
}

export interface WorkoutLog {
    id: string;
    user_id: string;
    exercise_id: string;
    exercise?: Exercise;
    plan_id: string | null;
    set_number: number;
    weight_kg: number;
    reps: number;
    rpe: number | null;
    notes: string | null;
    completed_at: string;
    created_at: string;
}

export interface DailyStats {
    id: string;
    user_id: string;
    date: string;
    water_ml: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    created_at: string;
    updated_at: string;
}

export interface Supplement {
    id: string;
    user_id: string;
    name: string;
    dosage: string | null;
    time_of_day: SupplementTime;
    created_at: string;
}

export interface SupplementLog {
    id: string;
    user_id: string;
    supplement_id: string;
    supplement?: Supplement;
    date: string;
    taken: boolean;
    created_at: string;
}

// Onboarding form state
export interface OnboardingData {
    height_cm: number;
    weight_kg: number;
    age: number;
    gender: Gender;
    body_type: BodyType;
    goal: Goal;
    equipment: string[];
}

// TDEE calculation
export interface TDEEResult {
    bmr: number;
    tdee: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

// Calendar events
export type CalendarEventType = "workout" | "rest" | "missed";

export interface CalendarEvent {
    id: string;
    user_id: string;
    date: string;
    event_type: CalendarEventType;
    muscle_group: string | null;
    notes: string | null;
    created_at: string;
}
