# Design Doc: Advanced Room Preference Strategy

This document outlines the design and implementation strategy for evolving from a single `pref_room_id` to a more flexible and powerful `room_preferences` system. This change enhances the scheduling algorithm's intelligence and improves the user experience for academic planners.

---

## 1. The Problem with the Singular `pref_room_id`

The initial implementation of a single `pref_room_id` on the `classes` table, while functional, presents several limitations:

- **Too Constraining:** It forces a Chairperson to select exactly one preferred room for every class offering. In reality, multiple rooms might be equally suitable.
- **Inefficient Workflow:** This becomes a bottleneck for bulk-adding class offerings, as a specific room must be chosen for each one, slowing down the data entry process.
- **A False Dilemma:** It forces a choice between two valid user needs:
    1.  The need for **flexibility** (providing a pool of acceptable rooms).
    2.  The need for **specificity** (identifying a single, truly preferred room).

## 2. The Solution: A `room_preferences` JSONB Column

To address these limitations, we will replace the `pref_room_id` column with a new `JSONB` column on the `classes` table named **`room_preferences`**.

This column will store a JSON object with a flexible structure, allowing for more expressive preferences.

### a. Proposed Schema Change

```sql
-- 1. Drop the old, restrictive column
ALTER TABLE public.classes DROP COLUMN IF EXISTS pref_room_id;

-- 2. Add the new, flexible JSONB column
ALTER TABLE public.classes ADD COLUMN room_preferences JSONB;
```

### b. Structure of the `room_preferences` Object

The JSON object will support two optional keys:

- **`priority` (integer):** The ID of the single, most-preferred room.
- **`options` (array of integers):** A list of other acceptable room IDs.

#### Example Use Cases:

-   **A strong, single preference:** A specialized engineering class requires a specific lab (ID: 101).
    ```json
    { "priority": 101 }
    ```

-   **A flexible pool of rooms:** A generic lecture can be held in any of several similar halls (IDs: 201, 202, 203). This is ideal for bulk-adding.
    ```json
    { "options": [201, 202, 203] }
    ```

-   **A hybrid preference:** A chairperson prefers the newest lab (ID: 301) but knows two older labs (302, 303) are also perfectly fine.
    ```json
    { "priority": 301, "options": [302, 303] }
    ```

### c. Benefits of this Approach

- **Resolves the Dilemma:** Elegantly supports both specific and flexible room preferences.
- **Streamlines UI/UX:** Massively improves the efficiency of creating and managing class offerings, especially in bulk.
- **Future-Proof:** Using `JSONB` allows for easy extension in the future. We could add new keys like `"required_features": ["projector"]` without requiring another database migration.

---

## 3. Impact on System Components

### a. Algorithm Effectiveness

This change will **significantly improve** the effectiveness and quality of the generated schedules.

- **Richer Information:** The algorithms (CP and Memetic) thrive on detailed information. This provides a weighted preference system that they can use to make more intelligent decisions.
- **Better Optimization:** The goal moves from simply finding a *valid* schedule to finding a *good* schedule that aligns with user intent. The solver's cost function can be updated to heavily reward satisfying a `priority` preference and moderately reward satisfying an `options` preference.
- **Improved Search:** The algorithm can search for rooms more intelligently: `priority` first, then `options`, then any other valid room.

### b. The Role of the "Step 2: Select Rooms" UI

The existing "Step 2" UI on the generation page should **NOT** be removed. Its purpose is repurposed and clarified.

- **Old Purpose:** Select which rooms the algorithm can use.
- **New Purpose:** Define the **master availability pool** for the entire scheduling run.

This UI serves as a critical **top-down administrative override**. A Dean can use this panel to globally exclude a room from the entire semester's generation (e.g., if it's under maintenance), even if it's listed as a preference for a class.

### c. The New, Combined Workflow

The two features—class-level preferences and the global availability pool—work in concert:

1.  **Bottom-Up Preference (Chairperson):** When creating a class offering, the Chairperson defines its ideal rooms via the `room_preferences` field.
2.  **Top-Down Availability (Dean/Admin):** On the generation page, the Dean defines the set of all rooms that are operational for the semester via the "Step 2" panel.
3.  **Algorithm Execution (Backend):** The solver receives both inputs and follows this logic for each class:
    a. Does the class have a `priority` room? Is it in the master availability list from Step 2? If yes, try to place it there.
    b. If not, does the class have `options`? Are any of them in the master list? If yes, try to place it in one of them.
    c. If not, search for any other suitable room from the master availability list that meets the class's type and capacity requirements.

This combined approach creates a robust, flexible, and intelligent scheduling system that respects both high-level administrative constraints and detailed academic preferences.
