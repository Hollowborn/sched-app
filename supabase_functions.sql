-- =====================================================
-- Schema Migrations
-- =====================================================
-- Add new columns or modify existing ones here.
-- =====================================================

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS split_lecture BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS lecture_days TEXT[] NULL;

-- Add program_id to timetables for program-specific scheduling
ALTER TABLE public.timetables
ADD COLUMN IF NOT EXISTS program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL;

-- Drop the old unique constraint and add a new one including program_id
ALTER TABLE public.timetables
DROP CONSTRAINT IF EXISTS timetables_name_college_id_academic_year_semester_key;

ALTER TABLE public.timetables
ADD CONSTRAINT timetables_name_college_id_program_id_academic_year_sem_key
UNIQUE(name, college_id, program_id, academic_year, semester);

-- =====================================================
-- RPC Functions for conflict checking when adding schedule entries
-- =====================================================
-- Instructions:
-- 1. Open your Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste the entire contents of this file
-- 5. Click "Run" to execute
-- =====================================================

-- Function to check for room conflicts
CREATE OR REPLACE FUNCTION check_room_conflict(
    p_timetable_id INT,
    p_room_id INT,
    p_day_of_week VARCHAR,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schedules
        WHERE timetable_id = p_timetable_id
          AND room_id = p_room_id
          AND day_of_week = p_day_of_week
          AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check for instructor conflicts
CREATE OR REPLACE FUNCTION check_instructor_conflict(
    p_timetable_id INT,
    p_instructor_id INT,
    p_day_of_week VARCHAR,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schedules s
        JOIN public.classes c ON s.class_id = c.id
        WHERE s.timetable_id = p_timetable_id
          AND c.instructor_id = p_instructor_id
          AND s.day_of_week = p_day_of_week
          AND (s.start_time, s.end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check for block conflicts
CREATE OR REPLACE FUNCTION check_block_conflict(
    p_timetable_id INT,
    p_block_id INT,
    p_day_of_week VARCHAR,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schedules s
        JOIN public.classes c ON s.class_id = c.id
        WHERE s.timetable_id = p_timetable_id
          AND c.block_id = p_block_id
          AND s.day_of_week = p_day_of_week
          AND (s.start_time, s.end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql;

