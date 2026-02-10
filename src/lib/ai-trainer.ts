import { type Exercise, type Goal } from "./types";

/**
 * Equipment name → equipment_required mapping used in the exercises table
 */
const EQUIPMENT_MAP: Record<string, string[]> = {
    barbell: ["barbell"],
    dumbbells: ["dumbbells"],
    cables: ["cables"],
    machines: ["machines"],
    bodyweight: ["bodyweight"],
    bands: ["bands"],
    kettlebell: ["kettlebell"],
};

/**
 * Muscle group split definitions
 */
const SPLITS = {
    push_pull_legs: {
        push: ["chest", "shoulders", "triceps"],
        pull: ["back", "biceps"],
        legs: ["legs", "core"],
    },
    upper_lower: {
        upper: ["chest", "back", "shoulders", "biceps", "triceps"],
        lower: ["legs", "core"],
    },
    full_body: {
        full: ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"],
    },
};

/**
 * Training parameters based on goal
 */
const GOAL_PARAMS: Record<Goal, { sets: number; reps: number; rest: number }> = {
    hypertrophy: { sets: 4, reps: 10, rest: 90 },
    strength: { sets: 5, reps: 5, rest: 180 },
    weight_loss: { sets: 3, reps: 15, rest: 60 },
};

/**
 * Filter exercises by user's available equipment
 */
export function filterByEquipment(
    exercises: Exercise[],
    userEquipment: string[]
): Exercise[] {
    const availableTypes = new Set<string>();
    availableTypes.add("bodyweight"); // Always available

    for (const eq of userEquipment) {
        const mapped = EQUIPMENT_MAP[eq.toLowerCase()];
        if (mapped) {
            mapped.forEach((t) => availableTypes.add(t));
        } else {
            availableTypes.add(eq.toLowerCase());
        }
    }

    return exercises.filter((ex) =>
        availableTypes.has(ex.equipment_required.toLowerCase())
    );
}

/**
 * Generate a workout for a specific muscle group set
 */
export function generateWorkout(
    exercises: Exercise[],
    userEquipment: string[],
    goal: Goal,
    muscleGroups: string[],
    exercisesPerGroup: number = 2
): { exercise: Exercise; sets: number; reps: number; rest: number }[] {
    const available = filterByEquipment(exercises, userEquipment);
    const params = GOAL_PARAMS[goal];
    const workout: { exercise: Exercise; sets: number; reps: number; rest: number }[] = [];

    for (const group of muscleGroups) {
        const groupExercises = available.filter(
            (ex) => ex.muscle_group.toLowerCase() === group.toLowerCase()
        );

        // Pick compound first, then isolation
        const compounds = groupExercises.filter((e) => e.exercise_type === "compound");
        const isolations = groupExercises.filter((e) => e.exercise_type === "isolation");

        const selected = [...compounds.slice(0, 1), ...isolations.slice(0, 1)].slice(
            0,
            exercisesPerGroup
        );

        // If we don't have enough, fill from either pool
        if (selected.length < exercisesPerGroup) {
            const remaining = groupExercises.filter((e) => !selected.includes(e));
            selected.push(...remaining.slice(0, exercisesPerGroup - selected.length));
        }

        for (const exercise of selected) {
            workout.push({
                exercise,
                sets: params.sets,
                reps: params.reps,
                rest: params.rest,
            });
        }
    }

    return workout;
}

/**
 * Get a substitute exercise for the same muscle group with available equipment
 */
export function getSubstitute(
    currentExercise: Exercise,
    allExercises: Exercise[],
    userEquipment: string[],
    usedExerciseIds: string[]
): Exercise | null {
    const available = filterByEquipment(allExercises, userEquipment);
    const substitutes = available.filter(
        (ex) =>
            ex.muscle_group === currentExercise.muscle_group &&
            ex.id !== currentExercise.id &&
            !usedExerciseIds.includes(ex.id)
    );

    return substitutes.length > 0 ? substitutes[0] : null;
}

/**
 * Get the day's muscle groups based on split and day index
 */
export function getDayMuscleGroups(
    splitType: keyof typeof SPLITS,
    dayIndex: number
): string[] {
    const split = SPLITS[splitType];
    const keys = Object.keys(split);
    const key = keys[dayIndex % keys.length];
    return split[key as keyof typeof split];
}

export { SPLITS, GOAL_PARAMS };
