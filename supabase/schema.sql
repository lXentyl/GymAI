-- ============================================
-- GymAI — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  body_type TEXT CHECK (body_type IN ('ectomorph', 'mesomorph', 'endomorph')),
  goal TEXT CHECK (goal IN ('hypertrophy', 'strength', 'weight_loss')),
  unit_system TEXT DEFAULT 'metric' CHECK (unit_system IN ('metric', 'imperial')),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. EQUIPMENT INVENTORY
-- ============================================
CREATE TABLE public.equipment_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('free_weights', 'machines', 'cables', 'bodyweight', 'cardio', 'accessories')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own equipment" ON public.equipment_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own equipment" ON public.equipment_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own equipment" ON public.equipment_inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own equipment" ON public.equipment_inventory FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. EXERCISES (standard library)
-- ============================================
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment_required TEXT NOT NULL,
  difficulty TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  exercise_type TEXT DEFAULT 'compound' CHECK (exercise_type IN ('compound', 'isolation')),
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises are public (read-only for everyone)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercises are viewable by everyone" ON public.exercises FOR SELECT USING (TRUE);

-- ============================================
-- 4. WORKOUT PLANS
-- ============================================
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  split_type TEXT CHECK (split_type IN ('push_pull_legs', 'upper_lower', 'full_body', 'custom')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plans" ON public.workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.workout_plans FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. WORKOUT PLAN EXERCISES
-- ============================================
CREATE TABLE public.workout_plan_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 10,
  rest_seconds INTEGER DEFAULT 90,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plan exercises" ON public.workout_plan_exercises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workout_plans WHERE id = plan_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert own plan exercises" ON public.workout_plan_exercises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workout_plans WHERE id = plan_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update own plan exercises" ON public.workout_plan_exercises
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workout_plans WHERE id = plan_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete own plan exercises" ON public.workout_plan_exercises
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workout_plans WHERE id = plan_id AND user_id = auth.uid())
  );

-- ============================================
-- 6. WORKOUT LOGS (progressive overload)
-- ============================================
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe NUMERIC CHECK (rpe BETWEEN 1 AND 10),
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.workout_logs FOR DELETE USING (auth.uid() = user_id);

-- Index for fast progressive overload lookups
CREATE INDEX idx_workout_logs_exercise_date ON public.workout_logs(user_id, exercise_id, completed_at DESC);

-- ============================================
-- 7. DAILY STATS (nutrition & hydration)
-- ============================================
CREATE TABLE public.daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  water_ml INTEGER DEFAULT 0,
  calories NUMERIC DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own stats" ON public.daily_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON public.daily_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.daily_stats FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 8. SUPPLEMENTS
-- ============================================
CREATE TABLE public.supplements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  time_of_day TEXT DEFAULT 'morning' CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'pre_workout', 'post_workout')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own supplements" ON public.supplements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own supplements" ON public.supplements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own supplements" ON public.supplements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own supplements" ON public.supplements FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 9. SUPPLEMENT LOGS (daily taken/not-taken)
-- ============================================
CREATE TABLE public.supplement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplement_id UUID NOT NULL REFERENCES public.supplements(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, supplement_id, date)
);

ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own supplement logs" ON public.supplement_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own supplement logs" ON public.supplement_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own supplement logs" ON public.supplement_logs FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 10. SEED DATA: Exercise Library
-- ============================================
INSERT INTO public.exercises (name, muscle_group, secondary_muscles, equipment_required, difficulty, exercise_type, instructions) VALUES
-- CHEST
('Barbell Bench Press', 'chest', ARRAY['triceps', 'shoulders'], 'barbell', 'intermediate', 'compound', 'Lie flat on bench, grip barbell slightly wider than shoulders, lower to chest, press up.'),
('Dumbbell Bench Press', 'chest', ARRAY['triceps', 'shoulders'], 'dumbbells', 'beginner', 'compound', 'Lie flat on bench with dumbbells, press up and squeeze at top.'),
('Incline Dumbbell Press', 'chest', ARRAY['shoulders', 'triceps'], 'dumbbells', 'intermediate', 'compound', 'Set bench to 30-45 degrees, press dumbbells up from chest.'),
('Cable Flyes', 'chest', ARRAY['shoulders'], 'cables', 'intermediate', 'isolation', 'Stand between cables, bring handles together in hugging motion.'),
('Push-ups', 'chest', ARRAY['triceps', 'shoulders'], 'bodyweight', 'beginner', 'compound', 'Standard push-up position, lower chest to ground, press up.'),
('Machine Chest Press', 'chest', ARRAY['triceps', 'shoulders'], 'machines', 'beginner', 'compound', 'Sit at machine, press handles forward, control the return.'),

-- BACK
('Barbell Rows', 'back', ARRAY['biceps', 'rear_delts'], 'barbell', 'intermediate', 'compound', 'Hinge forward, pull barbell to lower chest, squeeze shoulder blades.'),
('Dumbbell Rows', 'back', ARRAY['biceps', 'rear_delts'], 'dumbbells', 'beginner', 'compound', 'One arm on bench, row dumbbell to hip.'),
('Lat Pulldowns', 'back', ARRAY['biceps'], 'cables', 'beginner', 'compound', 'Pull bar to upper chest, squeeze lats at bottom.'),
('Pull-ups', 'back', ARRAY['biceps', 'forearms'], 'bodyweight', 'advanced', 'compound', 'Hang from bar, pull chin above bar, lower controlled.'),
('Seated Cable Row', 'back', ARRAY['biceps', 'rear_delts'], 'cables', 'beginner', 'compound', 'Sit at cable row, pull handle to torso, squeeze back.'),
('Machine Row', 'back', ARRAY['biceps'], 'machines', 'beginner', 'compound', 'Sit at rowing machine, pull handles back, squeeze.'),

-- SHOULDERS
('Overhead Press', 'shoulders', ARRAY['triceps'], 'barbell', 'intermediate', 'compound', 'Press barbell overhead from front rack position.'),
('Dumbbell Shoulder Press', 'shoulders', ARRAY['triceps'], 'dumbbells', 'beginner', 'compound', 'Seated or standing, press dumbbells overhead.'),
('Lateral Raises', 'shoulders', ARRAY[]::TEXT[], 'dumbbells', 'beginner', 'isolation', 'Raise dumbbells out to sides to shoulder height.'),
('Face Pulls', 'shoulders', ARRAY['rear_delts', 'traps'], 'cables', 'beginner', 'isolation', 'Pull rope to face level, externally rotate at top.'),
('Machine Shoulder Press', 'shoulders', ARRAY['triceps'], 'machines', 'beginner', 'compound', 'Sit at machine, press handles overhead.'),

-- LEGS
('Barbell Squat', 'legs', ARRAY['glutes', 'core'], 'barbell', 'intermediate', 'compound', 'Bar on upper back, squat to parallel or below.'),
('Leg Press', 'legs', ARRAY['glutes'], 'machines', 'beginner', 'compound', 'Sit at leg press, push platform away, control return.'),
('Romanian Deadlift', 'legs', ARRAY['back', 'glutes'], 'barbell', 'intermediate', 'compound', 'Hinge at hips with slight knee bend, lower barbell along legs.'),
('Dumbbell Lunges', 'legs', ARRAY['glutes'], 'dumbbells', 'beginner', 'compound', 'Step forward, lower back knee, push back to start.'),
('Leg Curl', 'legs', ARRAY['hamstrings'], 'machines', 'beginner', 'isolation', 'Lie face down, curl weight toward glutes.'),
('Leg Extension', 'legs', ARRAY['quadriceps'], 'machines', 'beginner', 'isolation', 'Sit at machine, extend legs fully, lower controlled.'),
('Bodyweight Squats', 'legs', ARRAY['glutes', 'core'], 'bodyweight', 'beginner', 'compound', 'Stand shoulder width, squat down, drive back up.'),
('Goblet Squats', 'legs', ARRAY['glutes', 'core'], 'dumbbells', 'beginner', 'compound', 'Hold dumbbell at chest, squat to depth.'),

-- ARMS
('Barbell Curl', 'biceps', ARRAY['forearms'], 'barbell', 'beginner', 'isolation', 'Curl barbell up, squeeze biceps at top.'),
('Dumbbell Curl', 'biceps', ARRAY['forearms'], 'dumbbells', 'beginner', 'isolation', 'Alternating or simultaneous curls.'),
('Cable Curl', 'biceps', ARRAY['forearms'], 'cables', 'beginner', 'isolation', 'Curl cable attachment up, squeeze at top.'),
('Tricep Pushdowns', 'triceps', ARRAY[]::TEXT[], 'cables', 'beginner', 'isolation', 'Push cable attachment down, lock out at bottom.'),
('Skull Crushers', 'triceps', ARRAY[]::TEXT[], 'barbell', 'intermediate', 'isolation', 'Lie on bench, lower barbell to forehead, extend up.'),
('Dumbbell Tricep Extension', 'triceps', ARRAY[]::TEXT[], 'dumbbells', 'beginner', 'isolation', 'Overhead extension with dumbbell.'),
('Diamond Push-ups', 'triceps', ARRAY['chest'], 'bodyweight', 'intermediate', 'compound', 'Hands close together, push-up focusing on triceps.'),

-- CORE
('Plank', 'core', ARRAY['shoulders'], 'bodyweight', 'beginner', 'isolation', 'Hold push-up position on forearms, keep body straight.'),
('Cable Woodchops', 'core', ARRAY['obliques'], 'cables', 'intermediate', 'compound', 'Rotate torso while pulling cable diagonally.'),
('Hanging Leg Raises', 'core', ARRAY['hip_flexors'], 'bodyweight', 'advanced', 'isolation', 'Hang from bar, raise legs to parallel or higher.'),
('Crunches', 'core', ARRAY[]::TEXT[], 'bodyweight', 'beginner', 'isolation', 'Lie on back, curl shoulders off ground.');
