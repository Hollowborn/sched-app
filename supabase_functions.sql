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

