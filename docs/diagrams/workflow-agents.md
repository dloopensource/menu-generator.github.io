# Agent workflow and Project task transitions

Sequence of agent actions and GitHub Project board transitions for each
Allium spec feature, from spec authoring through tests to implementation.
Reflects the three-phase per-spec lifecycle defined in design doc §8.2.

## Diagram

```mermaid
sequenceDiagram
    actor Tend as allium:tend
    actor Test as test-engineer
    actor FE as frontend-engineer
    actor Weed as allium:weed
    participant Board as GitHub Project board

    Tend->>Board: Create "Spec: <feature>" in Backlog, self-assign
    Tend->>Board: Move Spec to In progress
    Tend->>Tend: Write specs/<feature>.allium
    Tend->>Tend: allium check + allium:propagate (test skeletons)
    Tend->>Board: Open PR → In review → Done (on merge)

    Test->>Board: Create "Tests: <feature>" in Backlog, self-assign
    Test->>Board: Wait for "Spec" Done → move to Ready → In progress
    Test->>Test: Fill failing Vitest tests against the spec
    Test->>Board: Open PR (failing tests committed) → In review → Done

    FE->>Board: Create "Implement: <feature>" in Backlog, self-assign
    FE->>Board: Wait for "Tests" Done → Ready → In progress
    FE->>FE: Implement until tests pass; npm run lint
    FE->>Weed: Verify spec ↔ code alignment
    Weed-->>FE: No drift / drift report
    FE->>Board: Open PR → In review → Done (on merge)
```

## Participants

- **allium:tend** — authors and maintains Allium specs in `specs/`. Runs `allium check` and `allium analyse`. Emits failing test skeletons via `allium:propagate`.
- **test-engineer** — completes the propagated test skeletons; writes RTL and user-event interactions; owns all `*.test.ts(x)` files. Does not write production code.
- **frontend-engineer** — writes all production code (components, hooks, reducers, services, styles) until failing tests pass. Does not author tests.
- **allium:weed** — review agent; verifies spec-to-code alignment for any PR touching `specs/*.allium` or code that maps to a spec. Reports drift and blocks merge until resolved.
- **GitHub Project board** — <https://github.com/users/dloopensource/projects/2/views/1>. Columns: Backlog → Ready → In progress → In review → Done.

## What this diagram does NOT cover

- The per-spec "block-until-merged" rule: Tests phase cannot start until the Spec PR is merged into implement-menu-gen; Implement phase cannot start until the Tests PR is merged.
- The code-health review agent, which runs alongside allium:weed on every PR and checks for tech debt, oversized files, naming, and clarity.
- Cross-spec dependency ordering: some Implement tasks block other Implement tasks (e.g. menu-generation.allium depends on generator-service.allium). See design doc §8.3 for the full dependency table.
- The implement-menu-gen → develop → main deployment path that runs after all feature tasks are merged.
