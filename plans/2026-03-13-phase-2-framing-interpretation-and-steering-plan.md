# Phase 2 Framing Interpretation And Steering Improvement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a pre-framing interpretation layer and UI explainability features so the Framing Workspace becomes more controllable, more transparent, and less dependent on raw prompt quality.

**Architecture:** This phase introduces a new `interpretContext()` step between structured user input and final framing generation. The backend will generate a normalized interpretation summary from the four research-context fields and active keyword steering signals, the frontend will display a concise explanation of how the system is reading the input, and the framing generator will consume the interpretation summary rather than relying only on raw user text.

**Tech Stack:** React 19, TypeScript, Vite, Express, OpenAI chat completions, existing framing pipeline skills, Notion-backed keyword persistence

---

## Relationship To Phase 1

This plan assumes [plans/2026-03-13-research-context-four-fields-plan.md](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/plans/2026-03-13-research-context-four-fields-plan.md) is already implemented or nearly complete.

Phase 1 improves input structure.

Phase 2 improves:

- interpretation quality
- framing explainability
- user trust
- output controllability

This phase should not be mixed into the first rollout unless there is enough time for prompt tuning and manual validation.

## Why Phase 2 Exists

Even after splitting the form into four fields, the system still has two important weaknesses:

- The backend still turns user input into a prompt too directly.
- The keyword constellation still strongly influences framing, but that influence is mostly invisible to the user.

The result is better than the current system, but still limited:

- users may not know how the system interpreted their intent
- users may not know why the framing skewed critical, exploratory, constructive, or solution-oriented
- the LLM still has to infer too much from raw text

Phase 2 addresses those issues by creating a visible intermediate layer.

## Scope

This phase adds four linked capabilities:

1. `interpretContext()` on the backend
2. an `interpretation summary` object in the framing run response
3. a `steering summary` UI block in the Framing Workspace
4. prompt changes so `framingGeneratorMVP` consumes the interpretation summary rather than only the raw composed context string

## Proposed System Behavior

### Before Phase 2

Flow:

1. User fills four fields
2. Backend composes them into labeled text
3. Active keywords produce rule-engine controls
4. LLM generates framing from raw context plus rule controls

### After Phase 2

Flow:

1. User fills four fields
2. Backend normalizes the structured context
3. Backend reads active keyword steering signals
4. `interpretContext()` creates an intermediate research interpretation
5. Backend returns that interpretation in the framing response
6. UI displays steering and interpretation summary
7. `framingGeneratorMVP` uses the interpretation summary plus rule controls to generate the final framing

This creates a more explicit reasoning chain and a more inspectable system.

## New Backend Concept: Interpretation Summary

### Recommended shape

Add a typed object like this:

```ts
export interface InterpretationSummary {
    topic_summary: string;
    context_summary: string;
    goal_summary: string;
    method_constraints_summary?: string;
    inferred_research_direction: string;
    inferred_contribution_mode: string;
    possible_risks: string[];
    steering_keywords: string[];
}
```

### Why this shape

This object does two jobs:

- summarizes the user intent in a cleaner, more stable representation
- exposes part of the system's hidden framing logic to the frontend

The fields should stay concise and operator-readable. This object is not meant to replace the final framing output; it is a bridge between input and framing.

## `interpretContext()` Design

### Responsibilities

`interpretContext()` should:

- read the four input fields
- read the active keyword constellation summary
- infer the likely framing direction
- produce a concise interpretation object
- avoid generating full paper prose
- avoid collapsing into the final framing output too early

### Recommended input

```ts
interface InterpretContextInput {
    context: StructuredResearchContext;
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;
    keyword_map_by_orientation: KeywordMapByOrientation;
    keyword_index: KeywordIndex;
    reasoning_control: ReasoningControl;
}
```

### Recommended implementation style

Use a dedicated LLM-backed step, not just a deterministic formatter.

Reason:

- the input text can still be messy or ambiguous
- summarization and intent inference benefit from model interpretation
- the step is lightweight and can be constrained tightly

### Prompt goals

The prompt for `interpretContext()` should tell the model to:

- restate the research topic and context precisely
- infer the likely direction without overcommitting
- mention when the user's input is broad or underspecified
- surface which steering terms are especially relevant
- return JSON only

### Important guardrail

Do not let `interpretContext()` produce final framing fields such as `research_question`, `background`, or `method`. Its job is interpretation, not end-product generation.

## Steering Summary Design

### What the UI should show

In the Framing Workspace, add a compact explainability panel that shows:

- dominant epistemic orientation
- dominant artifact role
- 3 to 6 steering keywords
- inferred research direction
- inferred contribution mode

### Why this matters

The Constellation Map already shapes the framing, but users do not see that when working inside the Framing tab. Adding a steering summary makes the system feel less magical and easier to steer intentionally.

### Placement recommendation

Show this panel:

- below the four input fields before running, if enough data is already available
- or above the framing results after running, if implementation should stay simpler

Recommended first version:

- show it in the result area after a successful run

This avoids needing extra background fetches before submission and reduces UI complexity in the first iteration.

## API Changes

### Framing run response extension

Extend the current response type in [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts):

```ts
export interface FramingRunResponse {
    title: string;
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
    abstract_en: string;
    abstract_zh: string;
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;
    interpretation_summary: InterpretationSummary;
}
```

### Compatibility note

If backward compatibility matters during rollout:

- mark `interpretation_summary` as optional initially
- update the frontend rendering to handle absence gracefully

## Pipeline Changes

### Current pipeline

Current execution in [backend/src/pipeline/runPipeline.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/pipeline/runPipeline.ts):

1. `constellationKeywordSync`
2. `artifactRoleInfluencer`
3. `constellationRuleEngine`
4. `framingGeneratorMVP`
5. `constellationAbstractGenerator`
6. `titleGenerator`

### Proposed Phase 2 pipeline

1. `constellationKeywordSync`
2. `artifactRoleInfluencer`
3. `constellationRuleEngine`
4. `interpretContext`
5. `framingGeneratorMVP`
6. `constellationAbstractGenerator`
7. `titleGenerator`

### Why insert after the rule engine

That is the earliest point where the system already knows:

- the dominant epistemic pattern
- the artifact-driven framing bias
- the method and contribution vocabulary

So `interpretContext()` can synthesize user intent with actual keyword steering rather than guessing blindly.

## `framingGeneratorMVP` Changes

### Current limitation

[backend/src/skills/framingGeneratorMVP.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/skills/framingGeneratorMVP.ts) currently receives:

- `user_context`
- `rule_engine_output`

This means the final generator still does too much interpretation work itself.

### Proposed new input

```ts
export interface FramingGeneratorInput {
    interpreted_context: InterpretationSummary;
    raw_context: string;
    rule_engine_output: ReasoningControl;
}
```

### Prompt recommendation

The system prompt can stay mostly intact.

The user prompt should become:

```text
── Interpreted research topic ──
{topic_summary}

── Interpreted context ──
{context_summary}

── Interpreted goal ──
{goal_summary}

── Method or constraints ──
{method_constraints_summary}

── Inferred framing direction ──
{inferred_research_direction}

── Inferred contribution mode ──
{inferred_contribution_mode}

── Steering keywords ──
{steering_keywords}

── Raw user context ──
{raw_context}

Generate the six framing fields as JSON.
```

This lets the generator rely on a cleaned intermediate representation while still preserving access to the original user intent.

## Frontend Design

### Result rendering

Update [frontend/src/components/FramingCard.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/FramingCard.tsx) to show:

- interpretation summary
- steering summary

This can be implemented as:

- a new small component such as `FramingInterpretationSummary.tsx`
- or an inline section inside `FramingCard`

Recommended first version:

- create a dedicated component

That keeps the main result editor from becoming too crowded.

### Suggested UI content

- `How the system is reading your input`
- `Dominant framing direction`
- `Steering keywords`
- `Potential ambiguity or risk`

### Visual strategy

- Reuse existing card styling from the current Framing result view
- Keep the summary concise
- Avoid making the interpretation block look like a warning unless there is an actual issue

## File Impact Summary

### Files to modify

- [backend/src/pipeline/runPipeline.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/pipeline/runPipeline.ts)
- [backend/src/skills/framingGeneratorMVP.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/skills/framingGeneratorMVP.ts)
- [backend/src/routes/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/routes/framing.ts)
- [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts)
- [frontend/src/api/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/api/framing.ts)
- [frontend/src/components/FramingCard.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/FramingCard.tsx)
- [frontend/src/schema/frontendContractSpec.json](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/schema/frontendContractSpec.json)

### Files likely to add

- `backend/src/skills/interpretContext.ts`
- `backend/src/schema/interpretationSummary.ts`
- `frontend/src/components/FramingInterpretationSummary.tsx`

## Risks and Tradeoffs

### Risk 1: Increased latency

Adding `interpretContext()` likely adds another LLM call.

Mitigation:

- keep the prompt short
- return a concise JSON object
- monitor if the extra latency is acceptable in the workspace

### Risk 2: Interpretation drift

If `interpretContext()` misreads the user's intent, the final framing may become more consistently wrong.

Mitigation:

- preserve `raw_context` in the final generator input
- show interpretation summary to the user
- keep summary concise and auditable

### Risk 3: UI overload

Too much explainability content could make the Framing Workspace feel noisy.

Mitigation:

- show only the highest-signal fields
- keep risk notes short
- collapse or visually separate interpretation from editable framing content

### Risk 4: Prompt over-constraining

If the interpretation summary is too rigid, it may suppress useful variation in the final output.

Mitigation:

- phrase inferred fields as guidance rather than absolute truth
- preserve the raw user context in the prompt

## Testing Strategy

### Backend

- `interpretContext()` returns valid JSON and required keys
- pipeline still succeeds with valid active keywords
- framing output remains parseable after prompt changes
- response now includes `interpretation_summary`

### Frontend

- result view renders cleanly when `interpretation_summary` exists
- result view still degrades gracefully if `interpretation_summary` is absent during rollout
- save and refine flows still work with the extended response shape

### Manual verification scenarios

1. Enter a broad exploratory topic and verify the interpretation stays exploratory rather than being over-specified
2. Enter a critical or problem-framing topic and verify steering summary reflects the active keyword constellation
3. Compare outputs before and after Phase 2 using the same four-field input
4. Confirm the interpretation summary is readable and actually helpful for a human operator

## Implementation Tasks

### Task 1: Define interpretation types

**Files:**
- Create: `backend/src/schema/interpretationSummary.ts`
- Modify: [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts)
- Modify: [frontend/src/schema/frontendContractSpec.json](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/schema/frontendContractSpec.json)

**Step 1: Add `InterpretationSummary` type on the backend**

- Define concise string fields and limited arrays

**Step 2: Mirror the type on the frontend**

- Extend `FramingRunResponse`

**Step 3: Update the API contract spec**

- Document the new response field

### Task 2: Implement `interpretContext()` skill

**Files:**
- Create: `backend/src/skills/interpretContext.ts`
- Modify: [backend/src/services/llmService.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/services/llmService.ts) only if helper support is needed

**Step 1: Define the skill input and output**

- Accept structured context plus steering data
- Return `InterpretationSummary`

**Step 2: Implement prompt builder and JSON parsing**

- Keep output concise
- Validate required keys

**Step 3: Add guardrails**

- Prevent the skill from generating final framing prose

### Task 3: Insert interpretation into the pipeline

**Files:**
- Modify: [backend/src/pipeline/runPipeline.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/pipeline/runPipeline.ts)
- Modify: [backend/src/routes/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/routes/framing.ts)

**Step 1: Call `interpretContext()` after rule engine generation**

- Build the interpretation from structured input and steering outputs

**Step 2: Include `interpretation_summary` in the final response**

- Extend the pipeline result object cleanly

**Step 3: Preserve compatibility during rollout**

- If interpretation fails unexpectedly, decide whether to fail hard or fall back

Recommended first behavior:

- fail hard in development
- consider fallback only after observing real traffic patterns

### Task 4: Update `framingGeneratorMVP`

**Files:**
- Modify: [backend/src/skills/framingGeneratorMVP.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/skills/framingGeneratorMVP.ts)

**Step 1: Extend input type**

- Add `interpreted_context`
- Optionally preserve `raw_context`

**Step 2: Rewrite the user prompt builder**

- Use interpreted sections explicitly
- Keep raw context as secondary grounding

**Step 3: Verify output validation still works**

- Keep required JSON keys unchanged

### Task 5: Add interpretation and steering UI

**Files:**
- Create: `frontend/src/components/FramingInterpretationSummary.tsx`
- Modify: [frontend/src/components/FramingCard.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/FramingCard.tsx)

**Step 1: Design a compact summary component**

- Show interpretation, steering keywords, and inferred direction

**Step 2: Render it above the editable framing fields**

- Keep the editing workflow intact

**Step 3: Handle absence safely**

- Do not break rendering if the field is temporarily missing

### Task 6: Verify end-to-end behavior

**Files:**
- No required permanent additions unless tests are introduced

**Step 1: Run backend checks**

Suggested commands:

```bash
cd backend
npm run build
npm run typecheck
```

**Step 2: Run frontend checks**

Suggested commands:

```bash
cd frontend
npm run build
npm run lint
```

**Step 3: Manual compare Phase 1 vs Phase 2 output quality**

- Use the same input across both versions
- Compare controllability, clarity, and explainability

## Out Of Scope

- Pre-run live interpretation before submit
- Editable interpretation summary before generation
- Persisting interpretation summaries to Notion DB1
- Full audit logs of keyword steering over time

Those can be future improvements if this phase proves valuable.

## Recommendation

Treat this phase as an explainability and control upgrade, not just a prompt tweak. The highest-value outcome is not merely "better wording"; it is creating a visible middle layer between user intent, constellation steering, and generated framing.
