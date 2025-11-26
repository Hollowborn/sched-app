# Gemini Assistant Guidelines for Sched-App

This document provides context and guidelines for the Gemini assistant when working on this SvelteKit project.

## 1. Project Overview

- **Project Name:** smart-sched
- **Description:** A web application for managing academic scheduling, including class offerings, instructor assignments, and timetable generation.
- **Primary Goal:** To create an intuitive and efficient scheduling tool for educational institutions using Genetic Algorithm, Memetic Algorithm, Constraint Programming (CP).

## 2. Tech Stack

- **Framework:** SvelteKit, Svelte 5 (using Runes)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with `shadcn-svelte` for UI components.
- **UI Feedback:** `svelte-sonner` for toasts.
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage)
- **Linting/Formatting:** ESLint, Prettier
- **Package Manager:** npm

## 3. Coding Conventions & Style

- **Svelte:**
  - Always use Svelte 5 Runes (`$state`, `$derived`, etc.) for reactivity.
  - Component file names should be `kebab-case.svelte`.
  - Use `lang="ts"` in script tags for TypeScript.
- **TypeScript:**
  - Use explicit types. Avoid `any` where possible.
  - Interfaces and type definitions are located in `src/lib/types/` or colocated with components if specific.
- **Imports:**
  - Use aliases for imports: `$lib/` for `src/lib/`, `$routes/` for `src/routes/`.
  - Group imports: 1. Svelte/SvelteKit, 2. External libs, 3. Internal aliases, 4. Relative paths.
- **Styling:**
  - Use Tailwind CSS utility classes directly in the markup.
  - For custom component styles, use `@apply` in a `<style>` tag if necessary, but prefer utility classes.
- **UI Components:**
  - Standardized usage of `DataTable` component for all tables, leveraging `ColumnDef` and `renderSnippet` for custom cell rendering.

## 4. Architectural Patterns

- **Authentication:** Centralized in `src/hooks.server.ts`. It validates the session (`safeGetSession`) and fetches the user's profile (role, college_id, and program_id) from the `public.users` table, storing them in `event.locals` for every server request.

- **Data Flow:** Pages are built with `+page.server.ts` (for `load` and `actions`) and `+page.svelte` (for UI).

- **Security (RBAC):** Role-based access control is enforced in all `load` functions and `actions` by checking `locals.profile.role` and its associated `college_id` or `program_id`.

- **Form Handling:** All forms use SvelteKit's `enhance` action. Feedback is provided by `svelte-sonner` toasts, which are triggered by the success or failure result from the server action.

- **Global State:** Simple Svelte stores (e.g., `modalStore.ts`, `searchStore.ts`) are used to control global components.

- **Global Command Palette:** A global search feature accessible via `Cmd/Ctrl+K`. It uses a client-side component (`search-command.svelte`) to display results and a dedicated, secure backend endpoint (`/api/search/+server.ts`) that performs role-based database queries across multiple tables.

- **UI Components:** Core UI components are from `shadcn-svelte` and located in `src/lib/components/ui`. Custom, more complex components are in `src/lib/components`.

## 5. Important Commands

- **Install Dependencies:** `npm install`
- **Run Development Server:** `npm run dev`
- **Build Project:** `npm run build`
- **Run Linter:** `npm run lint`
- **Run Formatter:** `npm run format`

## 6. Dos and Don'ts

- **DO:** Add tests for new features, especially for critical business logic.
- **DO:** Keep accessibility in mind when creating UI components.
- **DON'T:** Commit directly to the `main` branch. Please create a new branch for features or fixes.
- **DON'T:** Introduce new dependencies without discussing it first.

## 7. Project Status (Implemented Pages)

The following pages and features are considered complete and functional:

- **Authentication:**
  - `src/routes/login`: A complete, styled login page with promise toasts and error handling.
  - `src/hooks.server.ts`: Correctly handles session and fetches the complete user profile, including `program_id`.

- **Global Features:**
  - **Global Command Palette:** Accessible via `Cmd+K`, this feature allows users to quickly search for instructors, subjects, and rooms, as well as navigate to pages and perform actions. All search results fully respect the user's role and permissions.

- **Core Layout:**
  - `src/routes/menu/+layout.svelte`: Includes the dynamic sidebar, skeleton loading screen, and global modals.
  - `src/lib/components/site-header.svelte`: Refactored to be a sticky header that includes breadcrumbs, a desktop sidebar collapse trigger, a search trigger, and a new `HeaderUser` component with a popover menu.
  - `src/lib/components/app-sidebar.svelte`: Features a consistent user display in the footer using a reusable `UserAvatar` component.

- **Resource Management (`/menu/resources`)**
  - `.../subjects`: Full CRUD for the "Course Catalog" using a simple table and modals.
  - `.../instructors`: Full CRUD with a grid/table view switcher and dynamic workload calculation based on term filters.
  - `.../rooms`: Full CRUD with a grid/table view, managing building, features, is_general_use.
  - `.../blocks`: Tabbed interface for full CRUD of "Programs" and "Blocks," including a "Bulk Generate" tool for blocks.

- **Academic Planning (`/menu/academics`)**
  - `.../offerings`: Full CRUD for "Class Offerings", with `split_lecture` support.
  - `.../assignments`: Page to assign instructors to Class Offerings, using a `DataTable` and in-line popover editor.

- **Admin Console (`/menu/admin`)**
  - `.../users`: A complete, unified User Management dashboard.

- **Error Handling:**
  - `src/routes/+error.svelte`: A global, dynamic error page.

- **Timetable Generation (`/menu/timetables/generate`):**
  - A "Generation Dashboard" with role-aware UI and "Program Health" cards.

## 8. Next Steps (In-Progress / Planned)

- **Master Scheduler (`/menu/timetables/scheduler`):** The main visual, drag-and-drop scheduling interface. We are currently building this.
- **Auto-Scheduler (`/menu/timetables/generate`):** The algorithm is being enhanced to incorporate `split_lecture` logic and will be further improved with soft constraints and a scoring system (see `smart_features.md`).
- **Timetable Viewer (`/menu/timetables/view`):** A read-only, filterable view of published timetables.

## 9. Full Database Schema

This is the complete, normalized schema used for the project.

```sql
-- Drop old, potentially conflicting table if it exists from previous iterations
DROP TABLE IF EXISTS public.schedule_entries;

-- ENUM Types for structured data (using IF NOT EXISTS for idempotency)
DO $ BEGIN
    CREATE TYPE schedule_status AS ENUM ('Draft', 'Published', 'Archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

DO $ BEGIN
    CREATE TYPE course_offering_semester AS ENUM ('1st Semester', '2nd Semester', 'Summer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- Helper function to get the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
    RETURN COALESCE(user_role, 'guest');
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the college_id of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_college_id()
RETURNS INT AS $
DECLARE
    user_college_id INT;
BEGIN
    SELECT college_id INTO user_college_id FROM public.users WHERE id = auth.uid();
    RETURN user_college_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. COLLEGES TABLE
CREATE TABLE IF NOT EXISTS colleges (
    id SERIAL PRIMARY KEY,
    college_name VARCHAR(255) NOT NULL UNIQUE
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Dean', 'Registrar', 'Chairperson')), -- Added Chairperson
    college_id INTEGER REFERENCES colleges(id),
    program_id INTEGER REFERENCES programs(id), -- For Chairperson role
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    CONSTRAINT dean_requires_college CHECK (role <> 'Dean' OR college_id IS NOT NULL),
    CONSTRAINT chairperson_requires_program CHECK (role <> 'Chairperson' OR program_id IS NOT NULL)
);

-- 3. PROGRAMS TABLE
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    program_name VARCHAR(255) NOT NULL,
    college_id INTEGER REFERENCES colleges(id) ON DELETE RESTRICT NOT NULL
);

-- 4. BLOCKS TABLE
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    block_name VARCHAR(255) NOT NULL,
    program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
    year_level INTEGER NOT NULL CHECK (year_level BETWEEN 1 AND 5),
    estimated_students INTEGER NOT NULL DEFAULT 30, -- Added for capacity checks
    UNIQUE (block_name, program_id)
);

-- 5. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL UNIQUE,
    building VARCHAR(100),
    capacity INTEGER NOT NULL DEFAULT 30 CHECK (capacity > 0),
    type VARCHAR(50) NOT NULL, -- e.g., 'Lecture', 'Lab'
    owner_college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
    is_general_use BOOLEAN NOT NULL DEFAULT TRUE,
    features TEXT[] -- e.g., {'Projector', 'Computers'}
);

-- 6. INSTRUCTORS TABLE
CREATE TABLE IF NOT EXISTS instructors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    college_id INTEGER REFERENCES colleges(id) ON DELETE RESTRICT NOT NULL,
    max_load NUMERIC(4, 2) NOT NULL DEFAULT 18.00 CHECK (max_load >= 0),
    min_load NUMERIC(4, 2) NOT NULL DEFAULT 12.00 CHECK (min_load >= 0)
);

-- 7. SUBJECTS TABLE (The Course Catalog)
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    subject_code VARCHAR(50) NOT NULL UNIQUE,
    subject_name VARCHAR(255) NOT NULL,
    lecture_hours NUMERIC(4, 2),
    lab_hours NUMERIC(4, 2)
);

-- 8. TIMETABLES TABLE (The Master Container)
CREATE TABLE IF NOT EXISTS timetables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    semester course_offering_semester NOT NULL,
    academic_year VARCHAR(10) NOT NULL, -- e.g., '2025-2026'
    status schedule_status NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
    program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL, -- For program-specific timetables
    UNIQUE(name, college_id, program_id, academic_year, semester)
);

-- 9. CLASSES TABLE (Course Offerings)
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    instructor_id INTEGER REFERENCES instructors(id) ON DELETE SET NULL,
    block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE NOT NULL,
    semester course_offering_semester NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    pref_room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    split_lecture BOOLEAN NOT NULL DEFAULT FALSE,
    lecture_days TEXT[] NULL,
    UNIQUE(subject_id, block_id, semester, academic_year)
);



-- 10. SCHEDULES TABLE (The Time Slots)
DROP TABLE IF EXISTS public.schedules;
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    timetable_id INTEGER NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    course_type VARCHAR(10) NOT NULL CHECK (course_type IN ('Lecture', 'Lab')),
    CONSTRAINT time_valid CHECK (start_time < end_time),
    UNIQUE (timetable_id, room_id, day_of_week, start_time)
);

-- 11. INSTRUCTOR_SUBJECTS (Qualifications)
CREATE TABLE IF NOT EXISTS instructor_subjects (
    instructor_id INTEGER REFERENCES instructors(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (instructor_id, subject_id)
);

-- 12. SUBJECT_COLLEGES (Many-to-Many between Subjects and Colleges)
CREATE TABLE IF NOT EXISTS subject_colleges (
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    PRIMARY KEY (subject_id, college_id)
);

-- Add indexes for common query columns
CREATE INDEX IF NOT EXISTS idx_schedules_timetable_id ON schedules(timetable_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_room_id ON schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_classes_subject_id ON classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_instructor_id ON classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classes_block_id ON classes(block_id);
CREATE INDEX IF NOT EXISTS idx_classes_term ON classes(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_timetables_term ON timetables(academic_year, semester);


## 10. Development Log & Future Work

### Summary of 2025-11-26 Session

A major refactoring of the Timetable Generation page (`/menu/timetables/generate`) was completed. The goal was to create a more intuitive, powerful, and user-friendly interface for generating schedules.

**Key Accomplishments:**

1.  **UI/UX Overhaul:**
    *   The previous multi-card "health dashboard" was replaced with a unified, step-by-step workflow contained within a single main card.
    *   Program selection is now role-aware (Admins see all, Deans see their college's, Chairpersons see their own).
    *   A dynamic "Health Check" panel was added to provide instant feedback on a selected program's data quality before generation.
    *   "Smart Room Selection" is implemented, which pre-selects relevant rooms based on college ownership and general use status, while still allowing user customization.
    *   The UI now includes more granular constraints like `endTime` and `breakTime`.
    *   Users can now select between `Memetic Algorithm` and `Constraint Programming` (note: backend logic is currently placeholder).

2.  **Backend Refactoring:**
    *   The `load` function was optimized to support the new dynamic UI.
    *   The `createTimetable` and `generateSchedule` server actions were consolidated into a single, atomic operation for better reliability.
    *   The core solver was updated to respect the new `breakTime` constraint.
    *   The action now provides "Actionable Failure Reports," which lists the specific classes that failed to be scheduled, helping users diagnose data issues.

3.  **Bug Fixes & Schema Updates:**
    *   Updated the database schema documentation in `GEMINI.md` to reflect the new many-to-many relationship between `subjects` and `colleges`.
    *   Resolved a critical server-side Supabase error (`column ... does not exist`) caused by the schema change.
    *   Fixed multiple client-side Svelte reactivity bugs, including an error that caused checkboxes to crash on render and a bug where the program selection would not display correctly.

### Planned Future Enhancements

The following features and suggestions were discussed and are planned for future development cycles:

1.  **Advanced Algorithm Implementation:** The top priority is to implement the actual backend logic for the "Memetic Algorithm" and "Constraint Programming" options. The current implementation uses a basic greedy algorithm as a placeholder for both.
2.  **Asynchronous (Background) Generation:** To prevent browser timeouts on large and complex generation tasks, this feature would move the solver process to a background job. The UI would poll for updates and notify the user upon completion.
3.  **Saved Configuration Presets:** Allow users (especially Admins and Deans) to save a complete generator configuration (selected rooms, constraints, algorithm choice) as a named "preset" for quick one-click reuse in the future.
4.  **Visualizing Constraints:** Enhance the UI by providing more context next to constraint toggles. For example, showing the number of unassigned instructors next to the "Enforce Instructor Availability" checkbox.
```
