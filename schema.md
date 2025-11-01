-- Drop old, potentially conflicting table if it exists from previous iterations
DROP TABLE IF EXISTS public.schedule_entries;

-- ENUM Types for structured data (using IF NOT EXISTS for idempotency)
DO $$ BEGIN
CREATE TYPE schedule_status AS ENUM ('Draft', 'Published', 'Archived');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE course_offering_semester AS ENUM ('1st Semester', '2nd Semester', 'Summer');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- Helper function to get the role of the currently authenticated user
-- Assumes you have a public.users table linked to auth.users
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
DECLARE
user_role TEXT;
BEGIN
SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
RETURN COALESCE(user_role, 'guest'); -- Return 'guest' if no profile found or role is null
END;

$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the college_id of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_college_id()
RETURNS INT AS
$$

DECLARE
user_college_id INT;
BEGIN
SELECT college_id INTO user_college_id FROM public.users WHERE id = auth.uid();
RETURN user_college_id; -- Returns NULL if no college_id found
END;

$$
LANGUAGE plpgsql SECURITY DEFINER;


-- 1. COLLEGES TABLE
CREATE TABLE IF NOT EXISTS colleges (
    id SERIAL PRIMARY KEY,
    college_name VARCHAR(255) NOT NULL UNIQUE
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase Auth user
    username VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Dean', 'Registrar')), -- Enforce specific roles
    college_id INTEGER REFERENCES colleges(id), -- Nullable, but required for Deans
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')), -- Tracks admin-controlled status
    CONSTRAINT dean_requires_college CHECK (role <> 'Dean' OR college_id IS NOT NULL) -- Ensure Deans always have a college
);

-- 3. PROGRAMS TABLE
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    program_name VARCHAR(255) NOT NULL,
    college_id INTEGER REFERENCES colleges(id) ON DELETE RESTRICT NOT NULL -- Prevent deleting college if programs exist
);

-- 4. BLOCKS TABLE
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    block_name VARCHAR(255) NOT NULL,
    program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE NOT NULL, -- If program is deleted, blocks are too
    year_level INTEGER NOT NULL CHECK (year_level BETWEEN 1 AND 5), -- Allow up to 5th year? Adjust as needed
    -- Optional: Add student count for capacity checks later
    -- estimated_students INTEGER NOT NULL DEFAULT 30,
    UNIQUE (block_name, program_id) -- A block name should be unique within its program
);

-- 5. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL UNIQUE,
    building VARCHAR(100),
    capacity INTEGER NOT NULL DEFAULT 30 CHECK (capacity > 0),
    type VARCHAR(50) NOT NULL, -- e.g., 'Lecture', 'Lab', 'Auditorium'
    owner_college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL, -- If college deleted, room becomes general
    is_general_use BOOLEAN NOT NULL DEFAULT TRUE, -- Can others use if owned?
    features TEXT[] -- Array of features like 'Projector', 'Computers'
);

-- 6. INSTRUCTORS TABLE
CREATE TABLE IF NOT EXISTS instructors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    college_id INTEGER REFERENCES colleges(id) ON DELETE RESTRICT NOT NULL, -- Prevent deleting college if instructors exist
    max_load NUMERIC(4, 2) NOT NULL DEFAULT 18.00 CHECK (max_load >= 0),
    min_load NUMERIC(4, 2) NOT NULL DEFAULT 12.00 CHECK (min_load >= 0)
);

-- 7. SUBJECTS TABLE (The Course Catalog)
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    subject_code VARCHAR(50) NOT NULL UNIQUE,
    subject_name VARCHAR(255) NOT NULL,
    lecture_hours NUMERIC(4, 2) NOT NULL DEFAULT 3.0 CHECK (lecture_hours >= 0),
    lab_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.0 CHECK (lab_hours >= 0),
    college_id INTEGER REFERENCES colleges(id) ON DELETE RESTRICT NOT NULL, -- Prevent deleting college if subjects exist
    default_semester course_offering_semester -- Optional: When typically offered
);

-- 8. TIMETABLES TABLE (The Master Container)
CREATE TABLE IF NOT EXISTS timetables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    semester course_offering_semester NOT NULL,
    academic_year VARCHAR(10) NOT NULL, -- e.g., '2025-2026'
    status schedule_status NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Keep record even if user deleted
    college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL, -- Keep record even if college deleted
    UNIQUE(name, college_id, academic_year, semester) -- Name must be unique for a college in a specific term
);

-- 9. CLASSES TABLE (Course Offerings)
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE NOT NULL, -- If subject deleted, offering is too
    instructor_id INTEGER REFERENCES instructors(id) ON DELETE SET NULL, -- Keep offering if instructor leaves
    block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE NOT NULL, -- If block deleted, offering is too
    semester course_offering_semester NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    -- A block should only have one offering of a subject per term
    UNIQUE(subject_id, block_id, semester, academic_year)
);

-- 10. SCHEDULES TABLE (The Time Slots)
-- Drop table if it exists to ensure constraints are updated correctly
DROP TABLE IF EXISTS public.schedules;
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    -- Link to the master timetable document
    timetable_id INTEGER NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    -- Link to the specific class offering being scheduled
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    -- Link to the room used for this slot
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT, -- Prevent deleting room if scheduled
    -- Time and Day details
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    -- Lecture or Lab for this specific slot
    course_type VARCHAR(10) NOT NULL CHECK (course_type IN ('Lecture', 'Lab')),

    -- Constraints
    CONSTRAINT time_valid CHECK (start_time < end_time),

    -- Conflict detection: A room cannot be double-booked *within the same timetable instance*
    -- Allows different drafts (different timetable_id) to have conflicting room use temporarily.
    UNIQUE (timetable_id, room_id, day_of_week, start_time),

    -- Optional but recommended: Prevent scheduling a class outside its offering term (more complex)
    -- CONSTRAINT term_match FOREIGN KEY (timetable_id) REFERENCES timetables(id) -- requires function/trigger

    -- Optional but recommended: Check instructor availability within this timetable
    CONSTRAINT instructor_availability_check CHECK (
        NOT EXISTS (
            SELECT 1
            FROM schedules s_inner
            JOIN classes c_inner ON s_inner.class_id = c_inner.id
            JOIN classes c_outer ON schedules.class_id = c_outer.id
            WHERE s_inner.id <> schedules.id -- Exclude self-comparison
              AND s_inner.timetable_id = schedules.timetable_id
              AND c_inner.instructor_id IS NOT NULL
              AND c_inner.instructor_id = c_outer.instructor_id
              AND s_inner.day_of_week = schedules.day_of_week
              AND (s_inner.start_time, s_inner.end_time) OVERLAPS (schedules.start_time, schedules.end_time)
        )
    ),

     -- Optional but recommended: Check block availability within this timetable
    CONSTRAINT block_availability_check CHECK (
        NOT EXISTS (
            SELECT 1
            FROM schedules s_inner
            JOIN classes c_inner ON s_inner.class_id = c_inner.id
            JOIN classes c_outer ON schedules.class_id = c_outer.id
            WHERE s_inner.id <> schedules.id
              AND s_inner.timetable_id = schedules.timetable_id
              AND c_inner.block_id = c_outer.block_id
              AND s_inner.day_of_week = schedules.day_of_week
              AND (s_inner.start_time, s_inner.end_time) OVERLAPS (schedules.start_time, schedules.end_time)
        )
    )
);

-- Optional: Add table for instructor qualifications/subjects they can teach
CREATE TABLE IF NOT EXISTS instructor_subjects (
    instructor_id INTEGER REFERENCES instructors(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (instructor_id, subject_id)
);

-- Add indexes for common query columns to improve performance
CREATE INDEX IF NOT EXISTS idx_schedules_timetable_id ON schedules(timetable_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_room_id ON schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_classes_subject_id ON classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_instructor_id ON classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classes_block_id ON classes(block_id);
CREATE INDEX IF NOT EXISTS idx_classes_term ON classes(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_timetables_term ON timetables(academic_year, semester);

-- RPC Functions for conflict checking when adding schedule entries
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
