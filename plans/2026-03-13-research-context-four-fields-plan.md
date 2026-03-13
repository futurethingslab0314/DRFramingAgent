# Four-Field Research Context Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current single free-text `user_context` input with a four-field research context form that improves framing quality, control, and interpretability while remaining compatible with the existing pipeline.

**Architecture:** The frontend will collect four distinct inputs, validate that the first three are present, and submit a new structured payload to the backend. The backend will normalize those fields into a canonical context object, derive a composed prompt string for the current pipeline, and preserve a compatibility layer so the existing generation logic can be upgraded incrementally rather than rewritten all at once.

**Tech Stack:** React 19, TypeScript, Vite, Express, OpenAI chat completions, existing framing pipeline skills, Notion-backed persistence

---

## Why This Change

The current Framing Workspace sends a single `user_context` string from [frontend/src/components/ChatPanel.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ChatPanel.tsx) to [backend/src/routes/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/routes/framing.ts). That keeps the UI simple, but it creates three major problems:

- The system cannot distinguish topic, target context, intent, and optional constraints.
- Output quality depends heavily on the user already knowing how to write a good prompt.
- The pipeline combines strong keyword-based steering with weak visibility into how the user input is interpreted.

This redesign introduces a small amount of structure without turning the Framing Workspace into a long academic form.

## Recommended Field Model

Use four fields:

1. `research_topic`
   - Required
   - What phenomenon, issue, domain, or design space the user is working on
   - Example: `AI-assisted reflection tools for design students`

2. `target_context`
   - Required
   - Where, for whom, or in what setting the research is situated
   - Example: `graduate studio critique settings in HCI education`

3. `research_goal`
   - Required
   - What the user wants to understand, surface, question, construct, or improve
   - Example: `understand how reflection prompts shape students' articulation of uncertainty`

4. `method_or_constraints`
   - Optional
   - Methods, materials, artifacts, limitations, framing preferences, or practical constraints
   - Example: `prefer research-through-design; likely workshop probes rather than evaluation study`

### Why This Model

This is the best balance among three alternatives:

- `Topic / Audience / Goal / Constraints`:
  - Good for product-style framing
  - Slightly too generic for design-research language
- `Problem / Users / Methods / Expected Contribution`:
  - More explicit academically
  - Over-constrains early-stage exploratory work
- `Topic / Context / Goal / Method-or-Constraints`:
  - Recommended
  - Works for exploratory, critical, constructive, and solution-oriented framings
  - Keeps the optional fourth field flexible when the user is still early in the process

## Product Behavior

### New UX behavior

- Replace the current single textarea with four labeled inputs.
- The first three fields are required before submission.
- The fourth field is optional.
- The submit button stays disabled until all three required fields contain non-empty trimmed text.
- Field-level helper text should explain what belongs in each field.

### Form copy

Suggested labels and placeholders:

- `Research Topic`
  - Placeholder: `What phenomenon, issue, or design space are you working on?`
- `Target Context`
  - Placeholder: `Who, where, or what setting is this research situated in?`
- `Research Goal`
  - Placeholder: `What do you want to understand, challenge, construct, or improve?`
- `Method / Constraints (Optional)`
  - Placeholder: `Methods, artifacts, practical limits, or framing preferences`

### Validation behavior

- Trim all fields before submit.
- Show inline validation messages only after interaction or submit attempt.
- Do not allow whitespace-only values for required fields.
- Keep validation simple; no minimum word count in the first implementation.

## Target Data Model

### Frontend request type

Replace the current request shape in [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts):

```ts
export interface ResearchContextInput {
    research_topic: string;
    target_context: string;
    research_goal: string;
    method_or_constraints?: string;
}

export interface FramingRunRequest {
    context: ResearchContextInput;
    owner?: string;
}
```

### Backend canonical model

Introduce a backend-side normalized type, ideally near the framing route or schema layer:

```ts
export interface StructuredResearchContext {
    research_topic: string;
    target_context: string;
    research_goal: string;
    method_or_constraints?: string;
}
```

### Composed prompt string

To keep the current pipeline compatible, derive a single composed prompt string from the structured input:

```text
Research topic:
{research_topic}

Target context:
{target_context}

Research goal:
{research_goal}

Method or constraints:
{method_or_constraints or "None provided"}
```

This composed string becomes the short-term replacement for the old `user_context` payload passed into `runPipeline()`.

## API Contract Changes

### New request shape

Update `POST /api/framing/run` from:

```json
{
  "user_context": "string",
  "owner": "string?"
}
```

to:

```json
{
  "context": {
    "research_topic": "string",
    "target_context": "string",
    "research_goal": "string",
    "method_or_constraints": "string?"
  },
  "owner": "string?"
}
```

### Compatibility strategy

Use a temporary compatibility layer during rollout:

- Accept both the old `user_context` payload and the new `context` object for one transition period.
- Prefer `context` when both are present.
- If only `user_context` is present, continue current behavior.
- Once the frontend is migrated and stable, remove `user_context` support in a later cleanup pass.

This avoids breaking local development or other unpublished clients while the UI is being updated.

## Backend Design

### Route-level changes

Modify [backend/src/routes/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/routes/framing.ts) to:

- Validate the presence of `context.research_topic`
- Validate the presence of `context.target_context`
- Validate the presence of `context.research_goal`
- Treat `context.method_or_constraints` as optional
- Normalize and trim all fields
- Convert the structured object into a composed string before calling `runPipeline()`

### New helper

Add a small helper, either inside the framing route or a new utility module:

```ts
function composeResearchContext(context: StructuredResearchContext): string
```

Responsibilities:

- Normalize whitespace
- Omit empty optional sections cleanly
- Produce stable text formatting for the downstream prompt

### Pipeline integration

Short-term approach:

- Keep [backend/src/pipeline/runPipeline.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/pipeline/runPipeline.ts) unchanged
- Pass the composed string as the existing `userContext` argument

Mid-term extension:

- Upgrade `runPipeline()` and [backend/src/skills/framingGeneratorMVP.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/skills/framingGeneratorMVP.ts) to accept structured context directly
- Use field-aware prompt sections rather than a single merged block

The short-term approach is recommended for this implementation because it isolates risk and limits changes to one boundary.

## Frontend Design

### ChatPanel redesign

Modify [frontend/src/components/ChatPanel.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ChatPanel.tsx) to:

- Replace `context` state with four pieces of state or one `context` object state
- Add separate labels, placeholders, and helper text
- Disable submit until the first three fields are non-empty after trimming
- Submit the new structured payload through `runFraming()`

Recommended state shape:

```ts
const [context, setContext] = useState({
    research_topic: "",
    target_context: "",
    research_goal: "",
    method_or_constraints: "",
});
```

### API client updates

Modify [frontend/src/api/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/api/framing.ts) and [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts) to reflect the new request contract.

### Optional future UI enhancement

Below the form, show a compact preview card:

- Dominant epistemic orientation
- Dominant artifact role
- Number of active keywords

This is not required for the first implementation, but it would improve explainability and make the Framing Workspace feel less opaque.

## Prompt Design Recommendation

The current [backend/src/skills/framingGeneratorMVP.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/skills/framingGeneratorMVP.ts) user prompt is minimal. Once the four-field payload exists, the next prompt revision should preserve field labels explicitly:

```text
── Research topic ──
{research_topic}

── Target context ──
{target_context}

── Research goal ──
{research_goal}

── Method or constraints ──
{method_or_constraints}

Generate the six framing fields as JSON.
```

Even if the pipeline still receives a composed string initially, the composed string should preserve those section headers exactly. That will give the LLM more reliable structure immediately without requiring a larger architecture rewrite.

## File Impact Summary

### Files to modify

- [frontend/src/components/ChatPanel.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ChatPanel.tsx)
- [frontend/src/api/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/api/framing.ts)
- [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts)
- [frontend/src/schema/frontendContractSpec.json](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/schema/frontendContractSpec.json)
- [backend/src/routes/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/routes/framing.ts)

### Files that may be added

- `backend/src/schema/researchContext.ts`
- `backend/src/utils/composeResearchContext.ts`

### Files likely unchanged in first pass

- [backend/src/pipeline/runPipeline.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/pipeline/runPipeline.ts)
- [backend/src/services/llmService.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/services/llmService.ts)
- [frontend/src/components/FramingCard.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/FramingCard.tsx)

## Risks and Mitigations

### Risk 1: Existing clients break

Mitigation:

- Maintain temporary support for `user_context`
- Update the contract spec and frontend at the same time

### Risk 2: Four fields still produce low-quality outputs

Mitigation:

- Preserve explicit section labels in the composed prompt
- Add prompt revisions before introducing more complex backend logic

### Risk 3: Users become blocked by too much form structure

Mitigation:

- Keep only three required fields
- Leave the fourth field optional and broad
- Use short helper text rather than academic jargon

### Risk 4: Frontend and backend request types drift

Mitigation:

- Update `frontendContractSpec.json`
- Keep a single canonical request interface on the frontend
- Add backend validation with clear 400 errors

## Testing Strategy

### Frontend checks

- Required fields block submission until filled
- Optional fourth field can remain empty
- Payload shape sent by `runFraming()` matches the new contract
- Error handling still surfaces backend validation errors correctly

### Backend checks

- New structured payload is accepted and trimmed
- Missing required fields return `400`
- Legacy `user_context` payload still works during compatibility period
- Composed prompt string includes the correct section labels and values

### Manual verification scenarios

1. Fill only one or two fields and confirm submit stays disabled
2. Fill the first three fields and run framing successfully
3. Fill all four fields and verify generation reflects the optional method/constraint hint
4. Send a legacy payload manually and confirm compatibility still works
5. Save the generated framing to Notion DB1 and confirm the rest of the flow remains unaffected

## Implementation Tasks

### Task 1: Update request contracts

**Files:**
- Modify: [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts)
- Modify: [frontend/src/schema/frontendContractSpec.json](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/schema/frontendContractSpec.json)

**Step 1: Define new structured context interface**

- Add `ResearchContextInput`
- Update `FramingRunRequest` to use `context`

**Step 2: Update the contract spec**

- Replace `user_context` request docs with the new nested `context` object
- Document the optional fourth field clearly

**Step 3: Verify type references still compile conceptually**

- Confirm only request types change
- Ensure response types remain untouched

### Task 2: Redesign the Framing Workspace form

**Files:**
- Modify: [frontend/src/components/ChatPanel.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ChatPanel.tsx)
- Modify: [frontend/src/api/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/api/framing.ts)

**Step 1: Replace single textarea state with structured form state**

- Use one object state or four string states
- Keep owner field behavior unchanged

**Step 2: Add field labels, placeholders, and helper text**

- Implement the four-field UI
- Match existing visual language and card styling

**Step 3: Add required-field validation**

- Compute `canSubmit` from trimmed required values
- Keep button disabled until valid

**Step 4: Send the new payload shape**

- Submit `{ context, owner }`
- Normalize the optional field to `undefined` when empty if desired

### Task 3: Add backend normalization and compatibility handling

**Files:**
- Modify: [backend/src/routes/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/routes/framing.ts)
- Create: `backend/src/schema/researchContext.ts` or equivalent
- Create: `backend/src/utils/composeResearchContext.ts` or equivalent

**Step 1: Define the structured backend type**

- Add a reusable interface for the new context object

**Step 2: Add request parsing helpers**

- Parse either `req.body.context` or `req.body.user_context`
- Return a normalized structured representation or a 400-safe validation error

**Step 3: Compose the downstream prompt string**

- Build a stable sectioned string from the structured context

**Step 4: Keep pipeline invocation unchanged**

- Pass the composed string into `runPipeline(activeKeywords, composedContext)`

### Task 4: Tighten prompt structure without rewriting the pipeline

**Files:**
- Modify: [backend/src/skills/framingGeneratorMVP.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/skills/framingGeneratorMVP.ts) only if needed

**Step 1: Verify the composed string already gives enough structure**

- Prefer no code change if the composed string includes clear section headers

**Step 2: If necessary, refine the user prompt wrapper**

- Keep it JSON-only
- Preserve the four section labels

This task is intentionally optional in the first pass.

### Task 5: Verify end-to-end behavior

**Files:**
- No permanent file additions required unless tests are introduced

**Step 1: Run frontend checks**

Suggested commands:

```bash
cd frontend
npm run build
npm run lint
```

**Step 2: Run backend checks**

Suggested commands:

```bash
cd backend
npm run build
npm run typecheck
```

**Step 3: Manual test the Framing Workspace**

- Submit valid 3-field and 4-field forms
- Confirm generated results still render and save correctly

## Out of Scope for This Plan

- Adding a pre-framing interpretation summary step
- Surfacing dominant keyword steering in the Framing Workspace UI
- Persisting the structured input fields into Notion DB1 as separate properties
- Rewriting the pipeline to operate on structured context natively end-to-end

Those are strong next steps, but they should happen after this smaller redesign is stable.

## Recommendation

Implement the redesign in one focused pass, but keep the backend compatibility layer for one release cycle. The highest-value change is not the UI alone; it is the combination of structured frontend input plus backend normalization into a stable, labeled prompt format.
