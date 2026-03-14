# Guided Framing Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework DRFramingAgent from a four-field generator into a fast guided framing flow that makes its existing constellation-informed framing logic more visible and steerable for students.

**Architecture:** Keep `Framing Workspace` as the student-facing primary workflow and reposition `Constellation Map` as the curator-facing knowledge layer behind it. The existing framing pipeline already uses constellation knowledge during generation; this iteration adds an explicit expansion-and-steering phase before final generation so students can see and adjust part of that guidance earlier. The frontend will replace the current single form with a staged flow: idea seed, guided expansion, framing selection, framing canvas, refine, and export.

**Tech Stack:** React 19, TypeScript, Vite, Express, OpenAI chat completions, Notion API, existing framing pipeline, D3 constellation graph

---

## Product Direction Summary

- DRF remains a fast framing tool, not a full ideation sandbox.
- Students should enter one main idea first, then steer the process with selections and small text additions.
- The constellation should be semi-visible: students see translated research lenses, contexts, and tensions, not the full graph editor.
- The teacher or curator still maintains the underlying constellation knowledge structure.
- The current generator already uses constellation knowledge in the backend; this project surfaces part of that influence earlier in the user journey instead of waiting until the final output.

## Framing Workspace And Constellation Map Relationship

### Framing Workspace

- Primary student workflow
- Optimized for low-friction progression from vague idea to research framing
- Already depends on constellation-informed framing generation in the backend today
- Shows the constellation indirectly as:
  - research lenses
  - contexts
  - tensions or gaps
  - framing directions
- Accepts light user steering at each stage so students can redirect the same underlying knowledge before final generation

### Constellation Map

- Primary curator and teaching workflow
- Maintains the underlying keyword graph, epistemic orientations, artifact roles, and research relations
- Already shapes final framing outputs through the current pipeline
- In the new flow, also feeds the Framing Workspace with curated guidance rather than only influencing the final response invisibly
- Should gradually expose which lenses are active and why, but should not become the main student entry point

### Shared Logic

- The constellation is already the knowledge engine for `framingGeneratorMVP` and the broader framing pipeline
- The framing workspace remains the guided interaction layer
- A new backend translation layer sits in front of the existing generation pipeline
- This translation layer converts raw keywords and graph structure into student-facing guidance objects:
  - `lenses`
  - `contexts`
  - `tensions`
  - `framing_options`
- Final generation should still be performed by the constellation-informed framing pipeline, now using both the original knowledge structure and the student's selected guidance

### Target Mental Model

- `Constellation Map` answers: "What research worldview and vocabulary are we teaching, and how should it shape framing?"
- `Framing Workspace` answers: "How does a student move through that worldview quickly and clearly, with visible guidance before the final output?"

## Target Student Flow

1. Student enters one `idea seed`.
2. System generates guided expansion from constellation-informed lenses, contexts, and tensions.
3. Student selects or lightly edits the direction.
4. System generates 2-3 framing directions.
5. Student picks one direction and adjusts a structured framing canvas.
6. Student refines tone and stance with quick controls plus a small freeform prompt.
7. System generates framing paragraph, research questions, contribution, and export-ready outputs.

## Implementation Strategy

- Deliver the new experience in phases so the current framing generator remains usable.
- Introduce the backend translation layer first.
- Replace the current input form only after the new expansion objects exist.
- Keep the existing constellation page operational during the transition.
- Delay any heavy graph-editing redesign until the guided flow proves useful.

## Task 1: Define Shared Guided Flow Contracts

**Files:**
- Modify: `frontend/src/types/framing.ts`
- Modify: `backend/src/schema/framingConstellationBot.ts`
- Modify: `frontend/src/schema/framingConstellationBot.ts`
- Create: `backend/src/utils/guidedFraming.ts`
- Test: `backend/src/utils/guidedFraming.test.ts`

**Step 1: Write the failing contract test**

Create `backend/src/utils/guidedFraming.test.ts` with assertions for the new response shapes:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildGuidedExpansion } from "./guidedFraming";

test("buildGuidedExpansion returns student-facing guidance buckets", () => {
    const result = buildGuidedExpansion([
        { label: "critical design", active: true, orientation: "critical" },
    ] as never);

    assert.ok(Array.isArray(result.lenses));
    assert.ok(Array.isArray(result.contexts));
    assert.ok(Array.isArray(result.tensions));
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: FAIL because `guidedFraming.ts` does not exist yet.

**Step 3: Define the shared interfaces**

Add minimal types for:

```ts
export interface GuidedOption {
    id: string;
    label: string;
    rationale: string;
}

export interface GuidedExpansion {
    lenses: GuidedOption[];
    contexts: GuidedOption[];
    tensions: GuidedOption[];
}

export interface FramingDirectionOption {
    id: string;
    title: string;
    summary: string;
    topic: string;
    context: string;
    gap: string;
    question: string;
    methodHint?: string;
}
```

**Step 4: Add a minimal implementation**

Create `backend/src/utils/guidedFraming.ts` with a deterministic placeholder builder that maps active keywords into empty-safe arrays. Add matching frontend and backend schema updates so TypeScript compiles.

**Step 5: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: PASS

**Step 6: Run typecheck**

Run: `cd backend && npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/utils/guidedFraming.ts backend/src/utils/guidedFraming.test.ts backend/src/schema/framingConstellationBot.ts frontend/src/schema/framingConstellationBot.ts frontend/src/types/framing.ts
git commit -m "feat: add guided framing contracts"
```

## Task 2: Add Backend Guided Expansion Endpoint

**Files:**
- Modify: `backend/src/routes/framing.ts`
- Modify: `backend/src/services/graphService.ts`
- Modify: `backend/src/services/notionService.ts`
- Modify: `backend/src/pipeline/runPipeline.ts`
- Create: `backend/src/skills/guidedExpansionGenerator.ts`
- Test: `backend/src/utils/researchContext.test.ts`

**Step 1: Write the failing endpoint test**

Extend `backend/src/utils/researchContext.test.ts` or add a route-level test fixture that expects an endpoint result with `lenses`, `contexts`, and `tensions` from an `idea_seed`.

```ts
test("guided expansion request returns research guidance", async () => {
    const response = await handler({
        body: { idea_seed: "AI in design education" },
    } as never);

    assert.equal(response.statusCode, 200);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/researchContext.test.ts`
Expected: FAIL because the route and payload shape do not exist yet.

**Step 3: Add request and response types**

Define:

- `GuidedExpansionRequest`
- `GuidedExpansionResponse`
- `FramingDirectionRequest`
- `FramingDirectionResponse`

Keep the current `/api/framing/run` path intact for backward compatibility during rollout. Add new routes such as:

- `POST /api/framing/expand`
- `POST /api/framing/directions`

**Step 4: Implement expansion generation**

Create `backend/src/skills/guidedExpansionGenerator.ts` that:

- reads active keywords
- uses graph or keyword metadata to derive candidate lenses
- groups likely contexts
- surfaces research tensions or gaps
- falls back safely when keyword coverage is sparse

Use deterministic heuristics first and add LLM enrichment only where needed.

**Step 5: Thread the new stage into the framing pipeline**

Update `runPipeline.ts` only enough to support the new staged requests. Do not merge all stages into one giant function.

**Step 6: Run tests**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/researchContext.test.ts`
Expected: PASS

**Step 7: Run backend verification**

Run: `cd backend && npm run typecheck`
Expected: PASS

Run: `cd backend && npm run build`
Expected: PASS

**Step 8: Commit**

```bash
git add backend/src/routes/framing.ts backend/src/services/graphService.ts backend/src/services/notionService.ts backend/src/pipeline/runPipeline.ts backend/src/skills/guidedExpansionGenerator.ts backend/src/utils/researchContext.test.ts
git commit -m "feat: add guided expansion backend"
```

## Task 3: Replace The Four-Field Entry Form With Idea Seed Flow

**Files:**
- Modify: `frontend/src/components/ChatPanel.tsx`
- Modify: `frontend/src/pages/FramingPage.tsx`
- Modify: `frontend/src/api/framing.ts`
- Modify: `frontend/src/i18n/messages.ts`
- Test: `frontend/src/docs/react-ui-architecture.md`

**Step 1: Write the failing UI state test plan**

Document the intended UI state transitions in `frontend/src/docs/react-ui-architecture.md` before coding:

- empty idea seed
- expansion loading
- guidance selection
- framing direction selection
- canvas editing
- refine and generate

This replaces ambiguity with an explicit state model.

**Step 2: Run lint to establish baseline**

Run: `cd frontend && npm run lint`
Expected: PASS on the current branch before changes.

**Step 3: Refactor the input component**

Replace the current four-textarea form with a staged panel that supports:

- `ideaSeed`
- selected lens ids
- selected context ids
- selected tension ids
- optional steering note
- selected framing direction

The student should see one main text input first and progressive disclosure afterward.

**Step 4: Update the page shell**

Update `FramingPage.tsx` so the right-hand result area can show:

- empty state before idea entry
- guidance preview after expansion
- framing canvas preview before final generation
- final generated framing output

**Step 5: Add API client wrappers**

Add `expandFramingIdea()` and `generateFramingDirections()` to `frontend/src/api/framing.ts`.

**Step 6: Update copy**

Add new labels and help text to `frontend/src/i18n/messages.ts`, including:

- idea seed prompt
- guidance cards
- optional note copy
- refine controls
- export language

**Step 7: Run frontend verification**

Run: `cd frontend && npm run lint`
Expected: PASS

Run: `cd frontend && npm run build`
Expected: PASS

**Step 8: Commit**

```bash
git add frontend/src/components/ChatPanel.tsx frontend/src/pages/FramingPage.tsx frontend/src/api/framing.ts frontend/src/i18n/messages.ts frontend/src/docs/react-ui-architecture.md
git commit -m "feat: add guided idea seed flow"
```

## Task 4: Build Framing Directions And Editable Canvas

**Files:**
- Modify: `frontend/src/components/FramingCard.tsx`
- Create: `frontend/src/components/FramingDirectionPicker.tsx`
- Create: `frontend/src/components/FramingCanvas.tsx`
- Modify: `frontend/src/types/framing.ts`
- Test: `frontend/src/docs/react-ui-architecture.md`

**Step 1: Write the failing interaction spec**

Extend `frontend/src/docs/react-ui-architecture.md` with explicit acceptance cases:

- selecting one framing option populates canvas fields
- editing one canvas field does not wipe the others
- generated result uses edited canvas values

**Step 2: Run lint baseline for touched files**

Run: `cd frontend && npm run lint`
Expected: PASS before implementation.

**Step 3: Implement framing direction picker**

Create `FramingDirectionPicker.tsx` to display 2-3 distinct framing options with:

- title
- short rationale
- stance summary
- select action

**Step 4: Implement structured framing canvas**

Create `FramingCanvas.tsx` with editable fields:

- topic
- context
- gap
- question
- method

Allow inline edits and a small "ask AI to adjust" note field.

**Step 5: Connect the result card**

Update `FramingCard.tsx` so final outputs are downstream of the canvas, not only the old direct run response.

**Step 6: Run frontend verification**

Run: `cd frontend && npm run lint`
Expected: PASS

Run: `cd frontend && npm run build`
Expected: PASS

**Step 7: Commit**

```bash
git add frontend/src/components/FramingCard.tsx frontend/src/components/FramingDirectionPicker.tsx frontend/src/components/FramingCanvas.tsx frontend/src/types/framing.ts frontend/src/docs/react-ui-architecture.md
git commit -m "feat: add framing direction and canvas stages"
```

## Task 5: Add Research Stance Refinement And Final Generation

**Files:**
- Modify: `backend/src/routes/framing.ts`
- Modify: `backend/src/services/llmService.ts`
- Modify: `frontend/src/components/ChatPanel.tsx`
- Modify: `frontend/src/components/FramingCard.tsx`
- Test: `backend/src/skills/bilingualFramingLocalizer.test.ts`

**Step 1: Write the failing refinement test**

Add a backend test that verifies refine controls influence generation input:

```ts
test("refinement request carries stance controls", () => {
    const payload = buildRefinePrompt({
        mode: "less_solution_driven",
        note: "focus on critique",
    });

    assert.match(payload, /less solution-driven/i);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/skills/bilingualFramingLocalizer.test.ts`
Expected: FAIL because stance refinement logic is absent.

**Step 3: Add refinement modes**

Support quick controls such as:

- `more_theoretical`
- `more_critical`
- `more_design_oriented`
- `more_empirical`
- `less_solution_driven`

Add an optional freeform `adjustment_note`.

**Step 4: Thread refinement through final generation**

Update generation calls so the final paragraph, research questions, and contribution explicitly honor both:

- selected guidance
- canvas edits
- refinement choices

**Step 5: Run backend verification**

Run: `cd backend && ./node_modules/.bin/tsx --test src/skills/bilingualFramingLocalizer.test.ts`
Expected: PASS

Run: `cd backend && npm run typecheck`
Expected: PASS

**Step 6: Run frontend verification**

Run: `cd frontend && npm run lint`
Expected: PASS

Run: `cd frontend && npm run build`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/routes/framing.ts backend/src/services/llmService.ts frontend/src/components/ChatPanel.tsx frontend/src/components/FramingCard.tsx backend/src/skills/bilingualFramingLocalizer.test.ts
git commit -m "feat: add research stance refinement"
```

## Task 6: Reposition Constellation Map As Curator Lens Manager

**Files:**
- Modify: `frontend/src/pages/ConstellationPage.tsx`
- Modify: `frontend/src/components/KeywordInspector.tsx`
- Modify: `frontend/src/components/EpistemicSummary.tsx`
- Modify: `frontend/src/components/ZoteroIngest.tsx`
- Modify: `README.md`

**Step 1: Write the failing documentation note**

Update `README.md` with the intended distinction:

- student-facing guided framing flow
- curator-facing constellation curation flow

This should be written before UI changes so the architecture is explicit.

**Step 2: Run frontend lint baseline**

Run: `cd frontend && npm run lint`
Expected: PASS

**Step 3: Add curator cues to the constellation page**

Update labels and layout so the page communicates:

- this is a knowledge curation space
- edits here influence student-facing lenses
- not every node should be surfaced directly to students

Add a summary panel describing which orientations or clusters are most likely to appear as guidance.

**Step 4: Make keyword inspection more pedagogical**

Add fields or helper copy that make a curator think in terms of:

- what lens this keyword teaches
- what tensions it surfaces
- whether it should be visible in student guidance

Do not redesign the graph interaction heavily in this pass.

**Step 5: Run verification**

Run: `cd frontend && npm run lint`
Expected: PASS

Run: `cd frontend && npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add frontend/src/pages/ConstellationPage.tsx frontend/src/components/KeywordInspector.tsx frontend/src/components/EpistemicSummary.tsx frontend/src/components/ZoteroIngest.tsx README.md
git commit -m "feat: reposition constellation as curator workspace"
```

## Task 7: End-To-End Verification And Rollout Guardrails

**Files:**
- Modify: `README.md`
- Modify: `frontend/README.md`
- Modify: `plans/2026-03-14-bilingual-ui-and-framing-plan.md`

**Step 1: Write rollout checklist**

Add a short rollout section covering:

- legacy `/api/framing/run` fallback
- migration order
- manual QA scenarios

**Step 2: Manual QA**

Verify these scenarios locally:

1. Student enters only one sentence and can still reach final output.
2. Student adds extra steering note during expansion and sees different framing directions.
3. Student edits framing canvas fields before generation.
4. Student uses `less solution-driven` and sees research-oriented language improve.
5. Curator updates constellation metadata and the next expansion response reflects it.

**Step 3: Run final verification**

Run: `cd backend && npm run typecheck`
Expected: PASS

Run: `cd backend && npm run build`
Expected: PASS

Run: `cd frontend && npm run lint`
Expected: PASS

Run: `cd frontend && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add README.md frontend/README.md plans/2026-03-14-bilingual-ui-and-framing-plan.md
git commit -m "docs: add guided framing rollout notes"
```

## Open Product Decisions To Confirm During Execution

- Should students ever see why a suggested lens came from a specific constellation cluster, or should that remain implicit?
- Should the framing canvas support optional method editing from day one, or can method stay AI-suggested in the first release?
- Should export remain one final panel, or should paper-target exports such as CHI and DIS become explicit templates later?
- Should curator-visible metadata live on existing keyword records or in a new derived layer?

## Recommended Delivery Order

1. Shared contracts
2. Backend guided expansion
3. Student-facing idea seed flow
4. Framing direction and canvas
5. Refinement controls
6. Constellation curator repositioning
7. Verification and docs

## Out Of Scope For This Pass

- Full student-facing graph editing
- Drag-and-drop concept mapping
- Multi-paper export templates with venue-specific formatting
- Major backend storage redesign
- Replacing Notion as the persistence layer
