# AI Scheduling Strategy: Gemini Integration

This document outlines two primary strategies for integrating the Gemini API into the scheduling workflow: as a **Direct AI Solver** and as an **AI-Assisted Hybrid Model**.

## Strategy 1: Direct AI Solver (A Third Option)

This approach involves offering "Generate with Gemini AI" as a third scheduling option alongside the existing CP and Memetic solvers.

### High-Level Workflow

1.  **Select Option:** The user selects the "Generate with Gemini AI" option.
2.  **Build Prompt:** The application gathers all relevant data (classes, rooms, instructors, blocks, time constraints) and constructs a detailed, structured prompt.
    - **Crucially, this prompt would also include a text area for the user to add constraints in natural language** (e.g., "no classes on Friday afternoons"). This is the primary advantage of this method.
3.  **API Call:** The prompt is sent to the Gemini API with instructions to return a complete schedule in a specified JSON format.
4.  **Parse & Validate:** The application receives the JSON response.
    - **This step is MANDATORY:** The application must run the generated schedule through a rigorous validation function to check for any hard constraint violations (room conflicts, instructor clashes, etc.).
5.  **Display Results:**
    - **If Valid:** The schedule is presented to the user, perhaps marked as "AI-Generated."
    - **If Invalid:** The application must report the conflicts to the user. An advanced implementation could even send the invalid schedule and the list of conflicts back to the API and ask it to "fix the errors."

### Pros and Cons

- **Pro: Unmatched Flexibility.** This is the only method that could easily handle ad-hoc, natural language constraints without requiring code changes.
- **Pro: "Creative" Solutions.** The AI might produce novel schedule structures that a traditional algorithm wouldn't, potentially optimizing for human-centric factors like "compactness" if prompted correctly.
- **Con: No Guarantee of Correctness.** The output is not guaranteed to be valid. The need for a separate, robust validation layer is non-negotiable and adds significant complexity.
- **Con: Scalability, Cost, and Speed.** For large-scale problems, this method would be slower and more expensive (due to API token usage) than the local algorithms.
- **Con: Non-Deterministic.** The same input might produce different results on subsequent runs, making it difficult to reproduce specific outcomes.

## Strategy 2: AI-Assisted Hybrid Model

This strategy focuses on using the Gemini API to enhance the existing, reliable CP and Memetic solvers, acting as an intelligent "co-pilot."

### Feature 1: Natural Language Constraint Processor

- **How it works:** A user enters a constraint like "Ensure a one-hour lunch break for everyone around noon." The API's role is to convert this text into a structured JSON object that is then fed into the _existing_ CP or Memetic solvers.
- **Benefit:** Achieves the flexibility of the Direct AI Solver without sacrificing the reliability and performance of the traditional algorithms.

### Feature 2: AI-Powered Explanations

- **How it works:** When a solver fails to schedule certain classes, the list of failures and constraints are sent to the API, which generates a simple, human-readable explanation of the likely cause.
- **Benefit:** Transforms cryptic error reports into actionable feedback for the user.

### Feature 3: Interactive Scheduling Suggestions

- **How it works:** In a drag-and-drop UI, if a user's manual change creates a conflict, the API can be asked to suggest alternative valid slots.
- **Benefit:** Makes manual scheduling and conflict resolution faster and more intuitive.

## Recommendation

Offering the **Direct AI Solver** as a third option is a feasible and exciting possibility, but it should be implemented with caution. It must be framed to the user as an "experimental" or "flexible" option, and the backend **must** enforce validation.

However, the **AI-Assisted Hybrid Model** presents a lower-risk, higher-reward path for initial implementation. Features like the **Natural Language Constraint Processor** would provide a revolutionary user experience while still relying on the proven correctness and performance of the existing solvers.

A phased approach is recommended:

1.  **Phase 1:** Implement the AI-Assisted Hybrid features, starting with Natural Language Constraints.
2.  **Phase 2:** Once the hybrid model is mature, explore and implement the Direct AI Solver as a third, experimental option for users who need maximum flexibility.
