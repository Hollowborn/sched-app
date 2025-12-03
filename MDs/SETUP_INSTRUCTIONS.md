# Supabase Database Setup Instructions

## Overview

This document provides instructions for setting up the necessary database functions for the Master Scheduler feature.

## Required Functions

The scheduler requires three RPC (Remote Procedure Call) functions to check for scheduling conflicts:

1. **check_room_conflict** - Checks if a room is already booked at a specific time
2. **check_instructor_conflict** - Checks if an instructor is already scheduled at a specific time
3. **check_block_conflict** - Checks if a block section already has a class at a specific time

## Setup Steps

### Step 1: Access Supabase SQL Editor

1. Open your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button

### Step 2: Execute the SQL

1. Open the `supabase_functions.sql` file in this project
2. Copy the entire contents of the file
3. Paste it into the SQL Editor in Supabase
4. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)

### Step 3: Verify Functions Created

You should see three success messages indicating the functions were created:

- ✅ `check_room_conflict`
- ✅ `check_instructor_conflict`
- ✅ `check_block_conflict`

To verify manually, you can run:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'check_%_conflict';
```

## What These Functions Do

### check_room_conflict

Prevents double-booking of rooms within the same timetable by checking if any existing schedule entry overlaps with the proposed time slot.

**Parameters:**

- `p_timetable_id`: The ID of the timetable
- `p_room_id`: The ID of the room to check
- `p_day_of_week`: The day (Monday, Tuesday, etc.)
- `p_start_time`: Start time (TIME format)
- `p_end_time`: End time (TIME format)

**Returns:** `TRUE` if conflict exists, `FALSE` otherwise

### check_instructor_conflict

Prevents scheduling conflicts where an instructor would be assigned to multiple classes at the same time.

**Parameters:** Same as above, with `p_instructor_id` instead of `p_room_id`

**Returns:** `TRUE` if conflict exists, `FALSE` otherwise

### check_block_conflict

Prevents scheduling conflicts where a block section would have multiple classes at the same time.

**Parameters:** Same as above, with `p_block_id` instead of `p_room_id`

**Returns:** `TRUE` if conflict exists, `FALSE` otherwise

## Testing the Functions

After creating the functions, you can test them with a query like:

```sql
-- Test room conflict check (should return false if no conflict)
SELECT check_room_conflict(
    1,                    -- timetable_id
    1,                    -- room_id
    'Monday',            -- day_of_week
    '08:00:00'::TIME,    -- start_time
    '10:00:00'::TIME     -- end_time
);
```

## Troubleshooting

### Function Already Exists Error

If you see "function already exists" errors, that's okay - the `CREATE OR REPLACE FUNCTION` statement will update existing functions.

### Permission Errors

If you encounter permission errors, ensure you're running the SQL as a database administrator or with sufficient privileges.

### Schema Not Found Errors

Ensure your `schedules` and `classes` tables are in the `public` schema (the default).

## Additional Notes

- These functions use PostgreSQL's `OVERLAPS` operator to detect time conflicts
- The functions only check conflicts within the same `timetable_id`
- All three checks are performed before any schedule entry is inserted
- If any conflict is detected, the scheduler will prevent the insertion and show an error message

## Support

If you encounter issues:

1. Check the Supabase SQL Editor logs for detailed error messages
2. Verify that all tables (`schedules`, `classes`) exist and are properly set up
3. Ensure the table schemas match the definitions in `schema.md`
