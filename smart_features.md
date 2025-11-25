# Proposed "Smart" Features for smart-sched

This document outlines potential "smart" features that can be integrated into the application to enhance its functionality and provide a more intelligent and intuitive user experience.

### 1. Real-time Conflict Highlighting in the Scheduler

As classes are manually placed on the timetable grid, the UI could provide immediate visual feedback. This turns the scheduler from a passive grid into an active, intelligent canvas.

- **What it is:** If a user drags a class to a slot that creates a conflict, the item would turn red, and a tooltip would explain the issue (e.g., "Instructor Conflict: Prof. Smith is already scheduled for CS-201 at this time").
- **Smart aspect:** It would instantly check for:
  - **Instructor, Block, and Room double-bookings.**
  - **Room Capacity Warnings:** Highlight in yellow if the block's student count exceeds the room's capacity.
  - **Feature Mismatches:** Warn if a `Lab` class is placed in a `Lecture`-only room.

### 2. Intelligent Instructor Load Management

This helps administrators distribute work more effectively and fairly.

- **What it is:** Enhance the instructor assignment process by displaying their current workload in real-time.
- **Smart aspect:**
  - In the dropdown menu for assigning an instructor, each name could have a visual indicator next to it (e.g., `Prof. Doe (15/18 units)`).
  - The system could color-code or sort instructors, automatically prioritizing those who are underloaded and de-emphasizing those who are already at their maximum load.

### 3. "Best Fit" Room Suggestions

Instead of making users sift through a long list of rooms, the system can recommend the most suitable ones.

- **What it is:** When creating or scheduling a class, the room selection dropdown would be ordered by suitability.
- **Smart aspect:** The ranking algorithm would prioritize rooms based on a combination of factors:
  1.  The user's `pref_room_id`.
  2.  Correct `type` (e.g., Lab vs. Lecture).
  3.  Sufficient `capacity` (not too big, not too small).
  4.  Ownership by the class's college (`owner_college_id`).

### 4. The Auto-Scheduler (Constraint-Based Generation)

This is the ultimate smart feature, turning weeks of manual work into a single click.

- **What it is:** A tool that automatically generates a complete, conflict-free timetable based on all the defined class offerings.
- **Smart aspect:** The algorithm would not just place classes randomly; it would try to optimize the schedule by satisfying a hierarchy of constraints:
  - **Hard Constraints (Must-haves):** No conflicts for rooms, instructors, or blocks.
  - **Soft Constraints (Nice-to-haves):**
    - Respect `split_lecture` and `lecture_days` preferences.
    - Try to assign the `pref_room_id`.
    - Minimize large gaps in the schedule for student blocks.
    - Group classes for the same block close together.

### 5. In-App Guidance & Feature Discovery

To help users become familiar with the application's features, we can implement several standard UX patterns.

-   **Contextual Tooltips (for Icons and Buttons)**
    -   **How it works:** When a user hovers over an icon or button, a small label appears explaining its function.
    -   **Best for:** Clarifying the function of unlabeled icons.
    -   **Component to use:** The **`<Tooltip>`** component.

-   **Feature Spotlights (for New or Key Features)**
    -   **How it works:** A small pop-up with a short message and a "Got it" button points to a new UI element the first time a user sees it.
    -   **Best for:** Announcing new features like the "Split Lecture" badges.
    -   **Component to use:** The **`<Popover>`** component.

-   **A "What's New" or "Tips" Center**
    -   **How it works:** A dedicated icon (e.g., a question mark) in the header opens a modal or drawer containing a list of recent changes and tips.
    -   **Best for:** Providing a non-intrusive, on-demand help center.
    -   **Component to use:** The **`<Dialog>`** (modal) or **`<Drawer>`** (side panel).

-   **Guided Product Tour (for First-Time Onboarding)**
    -   **How it works:** A series of popovers guide the user step-by-step through a key workflow.
    -   **Best for:** A user's very first visit to a complex page like the Scheduler.
    -   **Component to use:** Can be built with a series of **`<Popover>`** components, often managed by a state machine or a small routing library.

### 6. LLM-Powered Enhancements (e.g., Google Gemini)

Integrating a Large Language Model can provide a new layer of intelligence and user-friendliness across the application.

-   **LLM-Enhanced Auto-Scheduler**
    -   **What it is:** Allow the scheduling algorithm to interpret and act on soft constraints written in natural language.
    -   **Smart aspect:** A user could input requests like *"Prioritize morning classes for first-year students"* or *"Try to give Prof. Elara Vance Fridays off."* The LLM translates these into weighted rules for the generation algorithm.

-   **Intelligent Conflict Resolution**
    -   **What it is:** When a scheduling conflict occurs, the LLM can propose ranked, contextual solutions instead of just showing an error.
    -   **Smart aspect:** For an instructor double-booking, it might suggest: *"1. Move class to the 2 PM slot in Room 402 (available). 2. Reassign to Dr. Ben Carter (qualified and available)."*

-   **Natural Language Control & Querying**
    -   **What it is:** A conversational interface (e.g., a chat box) allowing users to manage the schedule with text commands.
    -   **Smart aspect:** Users can perform complex actions easily: *"Show all qualified instructors for 'Advanced Quantum Physics'"* or *"Find a lab room that's free on Tuesday mornings."*

-   **AI-Powered Data Analysis & Reporting**
    -   **What it is:** The LLM can analyze a completed timetable and generate a high-level summary of its quality.
    -   **Smart aspect:** It can produce insights like: *"The schedule is 98% conflict-free. However, the average student has 4 hours of gaps between classes. Room utilization is high at 85%, but the main computer lab is a bottleneck."*