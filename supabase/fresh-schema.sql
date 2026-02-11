-- ============================================
-- GymAI — SCHEMA COMPLETO DESDE CERO
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  age INTEGER,
  gender TEXT,
  body_type TEXT,
  goal TEXT,
  equipment TEXT[],
  unit_system TEXT DEFAULT 'metric',
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. EXERCISES
-- ============================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment_required TEXT NOT NULL,
  difficulty TEXT DEFAULT 'intermediate',
  exercise_type TEXT DEFAULT 'compound',
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exercises are viewable by everyone" ON public.exercises;
CREATE POLICY "Exercises are viewable by everyone" ON public.exercises
  FOR SELECT USING (TRUE);

-- ============================================
-- 3. WORKOUT PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  split_type TEXT,
  day_of_week INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  exercises JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON public.workout_plans;

CREATE POLICY "Users can view own plans" ON public.workout_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.workout_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.workout_plans
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.workout_plans
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. WORKOUT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe NUMERIC,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON public.workout_logs;

CREATE POLICY "Users can view own logs" ON public.workout_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.workout_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.workout_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise_date 
  ON public.workout_logs(user_id, exercise_id, completed_at DESC);

-- ============================================
-- 5. DAILY STATS
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_stats (
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

DROP POLICY IF EXISTS "Users can view own stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.daily_stats;

CREATE POLICY "Users can view own stats" ON public.daily_stats
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON public.daily_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.daily_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 6. CALENDAR EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('workout', 'rest', 'missed')),
  muscle_group TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.calendar_events;

CREATE POLICY "Users can view own events" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. SEED: Exercise Library (solo si está vacía)
-- ============================================
INSERT INTO public.exercises (name, muscle_group, secondary_muscles, equipment_required, difficulty, exercise_type, instructions) VALUES
('Barbell Bench Press', 'chest', ARRAY['triceps', 'shoulders'], 'barbell', 'intermediate', 'compound', 'Lie flat on bench, grip barbell slightly wider than shoulders, lower to chest, press up.'),
('Push-ups', 'chest', ARRAY['triceps', 'shoulders'], 'bodyweight', 'beginner', 'compound', 'Standard push-up position, lower chest to ground, press up.'),
('Dumbbell Rows', 'back', ARRAY['biceps', 'rear_delts'], 'dumbbells', 'beginner', 'compound', 'One arm on bench, row dumbbell to hip.'),
('Pull-ups', 'back', ARRAY['biceps', 'forearms'], 'bodyweight', 'advanced', 'compound', 'Hang from bar, pull chin above bar, lower controlled.'),
('Dumbbell Shoulder Press', 'shoulders', ARRAY['triceps'], 'dumbbells', 'beginner', 'compound', 'Seated or standing, press dumbbells overhead.'),
('Lateral Raises', 'shoulders', ARRAY[]::TEXT[], 'dumbbells', 'beginner', 'isolation', 'Raise dumbbells out to sides to shoulder height.'),
('Bodyweight Squats', 'legs', ARRAY['glutes', 'core'], 'bodyweight', 'beginner', 'compound', 'Stand shoulder width, squat down, drive back up.'),
('Dumbbell Lunges', 'legs', ARRAY['glutes'], 'dumbbells', 'beginner', 'compound', 'Step forward, lower back knee, push back to start.'),
('Barbell Curl', 'biceps', ARRAY['forearms'], 'barbell', 'beginner', 'isolation', 'Curl barbell up, squeeze biceps at top.'),
('Dumbbell Curl', 'biceps', ARRAY['forearms'], 'dumbbells', 'beginner', 'isolation', 'Alternating or simultaneous curls.'),
('Tricep Pushdowns', 'triceps', ARRAY[]::TEXT[], 'cables', 'beginner', 'isolation', 'Push cable attachment down, lock out at bottom.'),
('Diamond Push-ups', 'triceps', ARRAY['chest'], 'bodyweight', 'intermediate', 'compound', 'Hands close together, push-up focusing on triceps.'),
('Plank', 'core', ARRAY['shoulders'], 'bodyweight', 'beginner', 'isolation', 'Hold push-up position on forearms, keep body straight.'),
('Crunches', 'core', ARRAY[]::TEXT[], 'bodyweight', 'beginner', 'isolation', 'Lie on back, curl shoulders off ground.')
ON CONFLICT (name) DO NOTHING;
