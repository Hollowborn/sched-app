# Guide for Generating the Project Development Methodology Section

This document provides the key topics, terminology, and project-specific evidence needed to write the "Project Development" section of the research paper. The chosen software development methodology is **Rapid Application Development (RAD)**.

---

## 1. Introduction to Project Development

- **State the Chosen Methodology:** The development of the "sched-app," the primary research instrument, followed the **Rapid Application Development (RAD)** model.
- **Core Principle:** Mention that RAD is an agile methodology that prioritizes rapid prototyping and iterative development over extensive upfront planning.
- **Goal of using RAD:** Emphasize that the goal was to produce a functional, high-quality system quickly to facilitate the primary research on scheduling algorithms.

---

## 2. Justification for Selecting the RAD Model

Explain *why* RAD was the most appropriate choice for this academic research project.

- **Iterative and Flexible:** The nature of research involves discovery and changing requirements. RAD's iterative cycles allowed for flexibility in refining the scheduling algorithms and user interface as the research progressed.
- **Reduces Development Risk:** By building and testing prototypes early and often, potential design flaws were identified and corrected early, ensuring the final application was robust. (Mention the `src/routes/prototypes` directory as evidence of this practice).
- **Focus on Key Functionality:** RAD allowed development to focus on delivering the most critical components first (the core scheduling engine and UI), providing a working application for testing sooner.
- **Component-Based Construction:** The methodology's alignment with component-based architecture was a perfect fit for the chosen technology stack.

---

## 3. Phases of Rapid Application Development in this Project

Describe how the standard RAD phases were implemented.

### 3.1. Requirements Planning
- A high-level phase involving collaboration between developers and stakeholders (e.g., thesis advisor) to define the essential features.
- Key requirements identified: user roles (Admin, Dean, etc.), resource management (instructors, rooms, subjects), class offering creation, and an automated timetable generation engine.

### 3.2. User Design (Prototyping)
- This is a critical phase in RAD. Development heavily involved creating, testing, and refining prototypes.
- **Evidence:** The project contains a dedicated `src/routes/prototypes` directory where different UI concepts for timetables, dashboards, and controls were built and evaluated.
- **Tools for Rapid Prototyping:** The use of **`shadcn-svelte`** was instrumental in this phase, allowing for the rapid assembly of high-fidelity UI prototypes from a library of pre-built components (buttons, tables, dialogs, etc.).

### 3.3. Construction
- The "build" phase, where the prototypes and components were integrated into a working application.
- Characterized by the use of a modern, efficient technology stack to accelerate development.
- **Component-Based Architecture:** The application was built using **SvelteKit**, a framework that encourages breaking the UI into small, reusable components. This modularity is a core tenet of RAD.
- **Backend-as-a-Service (BaaS):** **Supabase** was used to provide the database, authentication, and instant APIs. This eliminated months of traditional backend development, a key advantage of the RAD approach.
- **Utility-First Styling:** **Tailwind CSS** was used to style the application, enabling rapid UI implementation directly in the component markup.

### 3.4. Cutover (Implementation)
- The final phase, involving testing the complete system, and preparing for deployment.
- This phase includes final data population, system evaluation, and the preparation of the software for use in the actual research (i.e., running the scheduling experiments).

---

## 4. Conclusion of Project Development

- Briefly summarize that the adoption of the RAD methodology, supported by a modern technology stack, was highly successful.
- It enabled the rapid and efficient development of a complex software artifact, the `sched-app`, allowing the research to focus more on its primary objective: the analysis and evaluation of automated timetable generation algorithms.
