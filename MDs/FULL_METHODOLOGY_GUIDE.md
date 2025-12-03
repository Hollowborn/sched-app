# Guide for Generating the Full Methodology Chapter

This document provides a structured outline, key concepts, and project-specific details for each subtopic of the Methodology chapter. It is intended to be used as a comprehensive context file for an LLM.

---

# Chapter 3: Methodology

## 3.1 Research Design

- **Primary Paradigm:** Define and adopt the **Design Science Research (DSR)** paradigm.
- **Justification:** Explain that DSR is appropriate because this research focuses on solving a real-world problem (inefficient academic scheduling) through the creation of a novel IT artifact (the `sched-app`).
- **DSR Process:** Briefly mention the phases of DSR that this research follows:
  1.  **Problem Identification:** The difficulty and time-consuming nature of manual timetable creation.
  2.  **Design and Development:** The construction of the `sched-app` as a solution.
  3.  **Evaluation:** Assessing the effectiveness of the generated schedules and the system itself.
  4.  **Communication:** The research paper itself.

## 3.2 Project Development

- This section provides a high-level overview of the process used to build the `sched-app` artifact.
- It covers both project management (scheduling and tasks) and the technical software engineering methodology.
- **Note:** For a detailed breakdown of the development methodology itself, refer to the `RAD_METHODOLOGY_GUIDE.md` file.

### a. Gantt Chart (no need to generate content for this as only the screenshot/image/illustration of the gantt chart itself is needed)

- **Purpose:** State that a Gantt chart was used as a project management tool to visualize the project timeline, tasks, and milestones.
- **Content:** The chart should map out the duration of key phases:
  - Initial Research & Requirement Analysis
  - System Design & Prototyping
  - Core Feature Development (Frontend & Backend)
  - Algorithm Implementation (CP and Memetic)
  - Testing & Evaluation
  - Final Paper Writing
- _(Instruction: State that the Gantt chart illustrates the project schedule, and then insert the actual chart/diagram into the paper.)_

### b. Project Evaluation

- **Purpose:** Describe how the success and quality of the `sched-app` were evaluated.
- **Methods:**
  - **Expert Evaluation (Heuristic Evaluation):** The system was presented to a subject matter expert (the thesis instructor who initially proposed the problem). Their feedback on usability, feature completeness, and correctness of the output was used to iteratively improve the application.
  - **Quantitative Performance Metrics:** The system was designed to self-evaluate. The success of the core scheduling function is measured by performance data automatically logged by the application, including:
    - **Generation Success Rate:** The percentage of classes successfully scheduled.
    - **Generation Time:** The computational time required to produce a timetable.
    - **Conflict Resolution:** The number of unscheduled classes (failures), which helps diagnose issues.
  - **Usability:** The user interface was evaluated based on its adherence to modern UI/UX principles, using the `shadcn-svelte` design system to ensure consistency and ease of use.

## 3.3 Requirement Analysis

- **Purpose:** To define the system's capabilities.
- **Functional Requirements (What the system does):**
  - **User Management:** Secure user authentication with Role-Based Access Control (RBAC) for Admin, Dean, Chairperson, and Registrar roles.
  - **Resource Management:** Full CRUD (Create, Read, Update, Delete) functionality for essential academic resources: `Subjects`, `Instructors`, `Rooms`, and `Programs/Blocks`.
  - **Academic Planning:** Management of `Class Offerings` per semester and assignment of instructors.
  - **Timetable Generation:** The core function to automatically generate conflict-free timetables using selectable algorithms (Constraint Programming, Memetic Algorithm) and user-defined constraints (e.g., `breakTime`, room selection).
  - **Timetable Visualization:** A user-friendly interface to view, filter, and review generated timetables.
- **Non-Functional Requirements (How the system performs):**
  - **Performance:** The system must generate schedules for a typical academic program in a reasonable timeframe.
  - **Usability:** The user interface must be intuitive and require minimal training.
  - **Security:** Access to data and features must be strictly enforced based on user roles.
  - **Scalability:** The system should be capable of handling data for multiple colleges and programs.

## 3.4 System Architecture

- **Model:** The `sched-app` is built on a **Client-Server Architecture**.
- **Client (Frontend):** A modern Single-Page Application (SPA) built with **SvelteKit**. It runs in the user's web browser and is responsible for rendering the user interface and handling user interactions.
- **Server (Backend):** A **Backend-as-a-Service (BaaS)** model provided by **Supabase**. This backend handles:
  - **Database:** A PostgreSQL database for all data persistence.
  - **Authentication:** Manages user login, sessions, and role-based access.
  - **APIs:** Provides instant, secure APIs for the client to interact with the database.
- **Data Flow:** The SvelteKit client communicates with the Supabase server via secure HTTP requests. SvelteKit's server-side capabilities (`+page.server.ts`) are used for loading data and handling form actions securely.

## 3.5 Design Specification

- **UI/UX Design:**
  - A professional and consistent user interface was achieved using the **`shadcn-svelte`** component library.
  - The application follows a standard dashboard layout, comprising a persistent sidebar for navigation, a header with breadcrumbs and user controls, and a main content area.
  - Styling is implemented using **Tailwind CSS**, a utility-first framework that allows for rapid and maintainable design.
- **Component-Based Structure:** The entire frontend is composed of reusable Svelte components, promoting modularity and maintainability.

## 3.6 Database Schema (I will provide the image of the schema myself)

- **Database System:** The application uses a **PostgreSQL** relational database, managed and hosted by Supabase.
- **Key Tables:** The schema is designed to model a typical academic environment. Core tables include:
  - `users`, `colleges`, `programs`, `blocks`
  - `subjects`, `instructors`, `rooms`
  - `classes` (Class Offerings)
  - `timetables` (The master schedule containers)
  - `schedules` (The individual time slots)
- _(Instruction: State that the full, normalized SQL schema is available in the appendix, or refer to the `schema.md` file. Briefly describe the primary relationships, e.g., a `program` has many `blocks`, an `instructor` is assigned to a `class`.)_

## 3.7 Research Instrument

- **The Instrument:** The primary instrument for this research is the custom-developed software application, the **`sched-app`**.
- **Function:** It is not merely a tool but an integrated environment designed to:
  1.  Manage all data required for academic scheduling.
  2.  Execute complex scheduling algorithms (CP and Memetic).
  3.  Automatically capture performance metrics from the algorithm execution.
  4.  Provide visualization tools to analyze the generated timetables.

## 3.8 Research Environment and Respondents

- **Environment:** The research was conducted in a development environment on a personal computer. The `sched-app` is a web-based application accessed through a standard web browser.
- **Respondents/Participants:**
  - This study **did not involve formal interviews or surveys** with a wide group of respondents.
  - **Expert Consultation:** An instructor from the institution's IT department served as the **subject matter expert**. This individual identified the initial problem, provided domain knowledge, and offered crucial feedback throughout the development process, acting as the primary stakeholder and expert evaluator.

## 3.9 Data Gathering Procedure

Two types of data were gathered:

1.  **System Requirements Data:**
    - **Document Analysis:** A list of required subjects (courses) and their details (lecture/lab hours) was compiled through research on the institution's public curriculum and other online resources.
    - **Informal Consultation:** Continuous, informal discussions with the subject matter expert (the instructor) were held to clarify requirements and validate features.
2.  **Algorithm Performance Data:**
    - This data was **generated automatically by the `sched-app`** itself during the evaluation phase.
    - After each timetable generation run, the system persists a "Generation Report" to a `metadata` field in the `timetables` database table. This report contains key quantitative metrics such as success rate, algorithm execution time, and a list of any classes that failed to be scheduled.

## 3.10 Statistical Treatment

- **Purpose:** To analyze the quantitative performance data generated by the scheduling algorithms.
- **Method:** **Descriptive Statistics** were used to summarize and compare the performance of the different algorithms.
- **Key Metrics Calculated:**
  - **Measures of Central Tendency:** **Mean (average)** generation time.
  - **Proportions:** **Success Rate** calculated as a percentage.
  - **Frequency Counts:** Tallying the number of unscheduled classes per run to identify common points of failure.
- These statistics were used to draw conclusions about the efficiency and effectiveness of the Constraint Programming vs. Memetic Algorithm approaches.

## 3.11 Definition of Terms

- _(Instruction: Create a glossary for terms that may be unfamiliar to the reader.)_
- **Rapid Application Development (RAD):** An agile software development methodology focused on rapid prototyping and iterative feedback.
- **Constraint Programming (CP):** A programming paradigm where relationships between variables are stated as constraints.
- **Memetic Algorithm (MA):** A type of evolutionary algorithm that includes a local search phase to refine solutions.
- **Heuristic:** A problem-solving technique that is practical but not guaranteed to be optimal; a "rule of thumb."
- **Role-Based Access Control (RBAC):** A security mechanism that restricts system access based on user roles.
- **Timetable:** A schedule of events or classes.
- **Class Offering:** A specific instance of a subject being offered in a particular semester to a specific block of students.
