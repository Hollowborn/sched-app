# Algorithm Improvements and Future Work

This document outlines potential improvements and future work for the scheduling algorithms (`cp.ts` and `memetic.ts`).

## 1. General Assessment

The current approach of implementing both a Constraint Programming (CP) solver and a Memetic Algorithm is robust and well-suited for the complex academic scheduling problem. It provides flexibility to prioritize either provable correctness (CP) or efficient optimization (Memetic Algorithm) based on the specific scheduling scenario.

## 2. `src/lib/server/algorithms/cp.ts` (Backtracking Solver)

### Current Strengths:

- **Completeness:** Guaranteed to find a conflict-free solution if one exists.
- **Heuristics:** Utilizes "Most Constrained Variable" heuristic for task sorting, which aids in pruning the search space.
- **Partial Solutions:** Returns the best partial solution found if a complete schedule cannot be generated, providing valuable feedback for the user.

### Recommended Improvements:

- **Implement a Timeout Mechanism:**
  - **Problem:** For large or highly constrained problems, the backtracking algorithm can run for an extremely long time, potentially causing server timeouts or an unresponsive UI.
  - **Solution:** Introduce a configurable timeout. If the solver exceeds this time limit, it should gracefully terminate and return the best partial solution found up to that point. This prevents indefinite execution and ensures a responsive user experience.
- **Consider True Forward Checking (Advanced):**
  - **Problem:** The current `isConsistent` function checks conflicts against already assigned tasks. While effective, it doesn't proactively reduce the domains (possible values) of unassigned variables.
  - **Solution:** Explore implementing true forward checking, where each new assignment propagates constraints to unassigned tasks, immediately eliminating inconsistent options from their possible rooms, days, and time slots. This can significantly reduce the search space and speed up early detection of dead-ends. This is a more complex enhancement but can yield substantial performance gains.

## 3. `src/lib/server/algorithms/memetic.ts` (Memetic Algorithm)

### Current Strengths:

- **Performance:** Designed for faster execution on large problems by exploring a subset of the solution space.
- **Optimization-Focused:** The fitness function can handle soft constraints, allowing the algorithm to optimize for schedule quality (e.g., room type preferences) in addition to hard constraints.
- **Local Search (Memetic Aspect):** The inclusion of hill climbing helps the algorithm refine solutions and avoid getting stuck in local optima, leading to better overall quality.

### Recommended Improvements:

- **Refine Fitness Function for Hard Constraints:**
  - **Problem:** The current implementation checks for conflicts after the algorithm finishes and might discard genes from the "best solution." This indicates the fitness function might not be penalizing hard conflicts severely enough. The goal is for the algorithm to _find_ a conflict-free best individual, not for the post-processing to _create_ one by discarding conflicting genes.
  - **Solution:** Drastically increase the penalty for hard constraint violations (room, instructor, block conflicts) in the `calculateFitness` function. A common approach is to assign an extremely large negative score or even `Infinity` for any individual with hard conflicts, ensuring that conflict-free individuals always rank higher. This will strongly guide the genetic process towards conflict-free schedules.
- **Make Parameters Configurable:**
  - **Problem:** `POPULATION_SIZE`, `GENERATIONS`, `MUTATION_RATE`, and `ELITISM_COUNT` are hardcoded. Optimal values for these parameters often depend on the specific problem instance and desired performance/quality trade-offs.
  - **Solution:** Expose these parameters as configurable options, potentially through the UI for advanced users or through the solver's input `constraints` object. This would allow for tuning the algorithm to achieve better results for different program sizes and complexity.
- **More Sophisticated Selection/Crossover/Mutation (Advanced):**
  - **Problem:** Basic genetic operators can sometimes lead to slow convergence or suboptimal results.
  - **Solution:** Investigate more advanced selection methods (e.g., ranked selection), crossover techniques (e.g., two-point crossover), or mutation strategies (e.g., swap mutation for schedule genes) to potentially improve convergence speed and solution quality.

By addressing these points, the scheduling capabilities of the application can be further enhanced, providing a more robust, efficient, and user-friendly experience.
