# Strategy for Unified and Cross-Program Scheduling

This document outlines the problem and proposed solution for handling shared resources, such as General Education (GE) instructors and rooms, across multiple academic programs that are scheduled independently.

---

## 1. The Problem: Conflicts from Isolated Scheduling

The current system generates timetables for one program at a time (e.g., for BSCS). This isolation creates significant conflicts when resources are shared between programs.

- **Instructor Conflicts:** A GE instructor who teaches classes in both `BSCS` and `BSIT` can be assigned conflicting time slots because the two timetable generation processes are unaware of each other.
- **Student Block Conflicts:** A student block (e.g., "BSCS 1A") can be scheduled for a GE class at the same time the `BSCS` department schedules them for a major-specific class, as these are treated as separate scheduling events.
- **Room Scarcity & Allocation:** There are often not enough dedicated rooms for GE courses, requiring them to use rooms owned by other colleges. However, scheduling them in isolation makes it impossible to know when those rooms are free.

---

## 2. The Core Strategy: Unified Scheduling

The fundamental solution is to shift from generating multiple, small, isolated timetables to generating **one single, comprehensive timetable** that includes all relevant programs and resources at once.

Instead of running the generator once for `BSCS` and then again for `BSIT`, it would be run **one time** with a combined, university-wide dataset for the given term.

### a. Unified Data Collection
Before calling the solver, the system must gather all competing resources into a single dataset for the scheduling algorithm:
- **Classes:** Collect all class offerings for all programs being scheduled simultaneously (e.g., all major classes for `BSCS`, `BSIT`, etc., plus all GE classes required by those programs).
- **Instructors:** The full list of instructors is implicitly gathered along with the classes.
- **Rooms:** The list of available rooms must include all rooms from all involved colleges, plus any general-use rooms.

### b. How Unified Scheduling Solves the Problem
When the existing CP or Memetic solver is fed this single, large-scale problem, its current conflict-detection logic will **automatically** resolve the core issues:
- **Instructor Conflicts are Eliminated:** The `enforceInstructor` constraint will see a GE instructor as a single entity and will not schedule them for two different classes at the same time, regardless of the program.
- **Block Conflicts are Eliminated:** The `enforceBlock` constraint will prevent a `BSCS` student block from being scheduled for both a GE class and a major-specific class simultaneously.
- **Room Conflicts are Eliminated:** The algorithm will have a global view of all available rooms and their scheduled times, preventing any double-bookings.

---

## 3. Enhancement: "Smart" Room Allocation

While unified scheduling allows GE classes to use other colleges' rooms, the current algorithm does so randomly. It treats a highly specialized lab and a general lecture hall as equally valid if their capacity and type match. To make this more intelligent, the algorithm should be enhanced to understand **room ownership**.

### Option 1: Soft Constraints (Recommended for Memetic Algorithm)
This is the most flexible and powerful approach.
- **Logic:** In the `calculateFitness` function of the Memetic Algorithm, if a class is scheduled in a room not owned by its parent college (and not marked as `general_use`), a small penalty is applied to the schedule's fitness score.
- **Result:** The algorithm will naturally **prefer** to use "home" rooms but is still **allowed** to "spill over" into other colleges' rooms if necessary to find a valid solution. This elegantly handles the need for overflow capacity.

### Option 2: Hard Constraints (For Both Algorithms)
This is a stricter, less flexible approach.
- **Logic:** The `possibleRooms` filtering logic is modified to only allow a class to be placed in a room where `room.owner_college_id` matches the class's parent college OR `room.is_general_use` is true.
- **Result:** This strictly enforces room ownership boundaries. It may be too restrictive for the GE scheduling problem unless GE classes are explicitly granted access to other college's rooms.

---

## 4. Proposed Implementation Roadmap

A phased approach is recommended to implement this strategy.

### Phase 1: Implement the Unified Scheduling Workflow
This phase focuses on the data-loading and UI aspects, requiring no changes to the core solver logic.
1.  **Modify the UI:** Update the "Generate Timetable" page to allow a user with sufficient privileges (e.g., Dean, Registrar) to select **multiple programs and/or colleges** to be scheduled together in a single run.
2.  **Update Data Fetching:** The `+page.server.ts` action for generation must be updated to query all classes, rooms, and instructors associated with **all** the selected programs/colleges.
3.  **Execute Solver:** Pass the unified dataset to the existing, unmodified solver.

**Outcome:** This phase immediately solves the critical instructor and block conflict issues across programs.

### Phase 2: Refine Room Allocation Logic
This phase involves modifying the algorithm files (`cp.ts` and `memetic.ts`) to implement the "Smart Room Allocation" feature.
1.  **Add Room Ownership Constraint:** Implement either the soft or hard constraint logic described in section 3. The soft constraint approach with the Memetic Algorithm is recommended for its flexibility.
2.  **Test and Tune:** Evaluate the new behavior and tune the fitness penalty (for the soft constraint) to achieve the desired balance between respecting room ownership and finding a complete schedule.

**Outcome:** The scheduling engine becomes more intelligent, respecting departmental resources while still accommodating the practical need for shared spaces.