# Tension Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current placeholder `X vs default assumptions` tension logic with a deterministic pattern-based candidate system plus a light LLM rewrite layer that produces more design-research-oriented tension / gap guidance.

**Architecture:** The backend will split tension generation into three stages: signal extraction from active constellation keywords, deterministic structured candidate generation with scoring and deduplication, and optional LLM rewriting of the top candidates into student-facing phrasing. Existing `generateGuidedExpansion()` will become an orchestrator that delegates to a richer tension pipeline while preserving current route contracts for `/api/framing/expand` and `/api/framing/directions`.

**Tech Stack:** TypeScript, Node.js test runner via `tsx --test`, Express, existing OpenAI `callLLM` service, current guided framing backend and frontend types

---

## Requirements Summary

- The current tension cards must stop being simple keyword rewrites.
- Tension generation must remain deterministic-first and debuggable.
- The first release should preserve the existing API shape expected by the frontend.
- The system should produce tensions that look like design research framing rather than generic AI copy.
- LLM usage must be constrained to language rewriting of already-structured candidates.
- The deterministic layer must work even when the LLM layer is unavailable.

## Design Mapping

This implementation plan is based on:

- [2026-03-16-tension-generation-design.md](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/docs/plans/2026-03-16-tension-generation-design.md)

Implementation should map the design into code in this order:

1. Define structured candidate types.
2. Build deterministic pattern selection and scoring.
3. Wire the candidate pipeline into `guidedExpansionGenerator`.
4. Add constrained LLM rewrite.
5. Verify route behavior and output quality.

## Non-Goals For This Pass

- Rebuilding the entire guided expansion system
- Adding a curator UI for editing tension patterns
- Introducing embeddings or semantic vector search
- Replacing the current direction-generation flow
- Requiring new Notion schema fields

## Task 1: Add Structured Tension Data Types

**Files:**
- Modify: `backend/src/schema/framingConstellationBot.ts`
- Modify: `frontend/src/schema/framingConstellationBot.ts`
- Modify: `frontend/src/types/framing.ts`
- Test: `backend/src/utils/guidedFraming.test.ts`

**Step 1: Write the failing schema test**

Extend `backend/src/utils/guidedFraming.test.ts` with a test that expects tension metadata to exist after deterministic generation.

```ts
test("buildGuidedExpansion returns structured tension metadata", () => {
    const result = buildGuidedExpansion([
        {
            term: "ethnography",
            active: true,
            orientation: "critical",
            artifact_role: "critique_device",
            weight: 1,
        },
    ]);

    assert.equal(result.tensions[0]?.metadata?.patternType !== undefined, true);
    assert.equal(Array.isArray(result.tensions[0]?.metadata?.sourceKeywords), true);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: FAIL because `metadata` fields do not exist yet.

**Step 3: Add new shared types**

Update backend and frontend schemas with:

```ts
export type TensionPatternType =
    | "normative_system_vs_lived_experience"
    | "functional_logic_vs_interpretive_inquiry"
    | "dominant_assumptions_vs_alternative_imagination"
    | "representation_vs_experience"
    | "collective_structure_vs_personal_difference";

export interface TensionMetadata {
    patternType: TensionPatternType;
    sourceKeywords: string[];
    sourceOrientation?: Orientation;
    score: number;
}

export interface StructuredTensionCandidate {
    id: string;
    leftPole: string;
    rightPole: string;
    patternType: TensionPatternType;
    sourceKeywords: string[];
    sourceOrientation?: Orientation;
    score: number;
    rationale: string;
    draftLabel: string;
}
```

Extend `GuidedOption` with optional `metadata?: TensionMetadata`.

**Step 4: Update frontend types to accept richer tension payloads**

Ensure `GuidedExpansionResponse` and related types do not break when `metadata` is present.

**Step 5: Run test to verify it still fails for the right reason**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: FAIL because logic still does not populate metadata.

**Step 6: Commit**

```bash
git add backend/src/schema/framingConstellationBot.ts frontend/src/schema/framingConstellationBot.ts frontend/src/types/framing.ts backend/src/utils/guidedFraming.test.ts
git commit -m "feat: add structured tension types"
```

## Task 2: Build Deterministic Signal Extraction And Pattern Matching

**Files:**
- Create: `backend/src/utils/tensionSignals.ts`
- Create: `backend/src/utils/tensionSignals.test.ts`
- Modify: `backend/src/utils/guidedFraming.ts`

**Step 1: Write the failing extraction test**

Create `backend/src/utils/tensionSignals.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { extractTensionSignals } from "./tensionSignals.js";

test("extractTensionSignals classifies pattern cues from active keywords", () => {
    const result = extractTensionSignals({
        ideaSeed: "A waking map that critiques standardized time",
        keywords: [
            {
                term: "ethnography",
                active: true,
                orientation: "critical",
                artifact_role: "critique_device",
                weight: 0.8,
            },
        ] as never,
    });

    assert.ok(result.patternHints.includes("normative_system_vs_lived_experience"));
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/tensionSignals.test.ts`
Expected: FAIL because the file does not exist.

**Step 3: Implement signal extraction**

Create `extractTensionSignals()` that returns:

```ts
interface TensionSignalSet {
    dominantOrientation?: Orientation;
    weightedKeywords: Array<{
        term: string;
        weight: number;
        orientation: Orientation;
        artifactRole: ArtifactRole;
        pipelineRole?: PipelineRole;
        notes?: string;
    }>;
    patternHints: TensionPatternType[];
    termCueMatches: string[];
}
```

Use:

- active keywords only
- sorted descending by weight
- orientation counts weighted by `weight`
- artifact-role-driven pattern boosts
- a small deterministic `TERM_CUES` dictionary

**Step 4: Keep the cue dictionary small and explicit**

Do not overbuild. Start with a short dictionary covering likely DRF domains:

- `time`
- `routine`
- `ethnography`
- `speculative`
- `fiction`
- `map`
- `data`
- `education`
- `ai`
- `interface`

**Step 5: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/tensionSignals.test.ts`
Expected: PASS

**Step 6: Run backend typecheck**

Run: `cd backend && npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/utils/tensionSignals.ts backend/src/utils/tensionSignals.test.ts backend/src/utils/guidedFraming.ts
git commit -m "feat: add tension signal extraction"
```

## Task 3: Add Deterministic Structured Candidate Builder

**Files:**
- Create: `backend/src/utils/tensionCandidates.ts`
- Create: `backend/src/utils/tensionCandidates.test.ts`
- Modify: `backend/src/utils/guidedFraming.ts`

**Step 1: Write the failing candidate test**

Create `backend/src/utils/tensionCandidates.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildStructuredTensionCandidates } from "./tensionCandidates.js";

test("buildStructuredTensionCandidates returns paired poles instead of single keyword labels", () => {
    const result = buildStructuredTensionCandidates({
        ideaSeed: "A waking map that critiques standardized time",
        signalSet: {
            dominantOrientation: "critical",
            weightedKeywords: [
                {
                    term: "ethnography",
                    weight: 1,
                    orientation: "critical",
                    artifactRole: "critique_device",
                },
            ],
            patternHints: ["normative_system_vs_lived_experience"],
            termCueMatches: ["time"],
        },
    } as never);

    assert.equal(result[0]?.leftPole.includes("system"), true);
    assert.equal(result[0]?.rightPole.length > 0, true);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/tensionCandidates.test.ts`
Expected: FAIL because the file does not exist.

**Step 3: Implement pattern libraries**

Create a deterministic pattern library with a few explicit pole templates per pattern type:

```ts
const TENSION_PATTERNS: Record<TensionPatternType, Array<{
    leftPole: string;
    rightPole: string;
    rationaleTemplate: string;
}>> = {
    normative_system_vs_lived_experience: [
        {
            leftPole: "standardized temporal systems",
            rightPole: "lived and subjective rhythms",
            rationaleTemplate: "Use this to frame how institutional or normative systems may suppress lived experience.",
        },
    ],
    ...
};
```

**Step 4: Implement candidate construction**

Build candidates from:

- dominant pattern hints
- top weighted keywords
- idea seed term matches

Each candidate should include:

- `leftPole`
- `rightPole`
- `patternType`
- `sourceKeywords`
- `sourceOrientation`
- `score`
- `rationale`
- `draftLabel`

`draftLabel` should be `${leftPole} vs ${rightPole}`.

**Step 5: Add redundancy control**

Deduplicate candidates by normalized `draftLabel` and collapse near-duplicates conservatively.

**Step 6: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/tensionCandidates.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/utils/tensionCandidates.ts backend/src/utils/tensionCandidates.test.ts backend/src/utils/guidedFraming.ts
git commit -m "feat: add deterministic tension candidates"
```

## Task 4: Add Candidate Scoring And Top-N Selection

**Files:**
- Modify: `backend/src/utils/tensionCandidates.ts`
- Modify: `backend/src/utils/tensionCandidates.test.ts`
- Modify: `backend/src/utils/guidedFraming.ts`

**Step 1: Write the failing scoring test**

Extend `backend/src/utils/tensionCandidates.test.ts`:

```ts
test("candidate scoring favors research-oriented tensions over generic keyword carryover", () => {
    const result = buildStructuredTensionCandidates({
        ideaSeed: "AI in design education",
        signalSet: {
            dominantOrientation: "critical",
            weightedKeywords: [
                {
                    term: "education",
                    weight: 0.9,
                    orientation: "critical",
                    artifactRole: "critique_device",
                },
                {
                    term: "ai",
                    weight: 0.8,
                    orientation: "problem_solving",
                    artifactRole: "solution_system",
                },
            ],
            patternHints: [
                "functional_logic_vs_interpretive_inquiry",
                "normative_system_vs_lived_experience",
            ],
            termCueMatches: ["ai", "education"],
        },
    } as never);

    assert.equal(result[0].score >= result[result.length - 1].score, true);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/tensionCandidates.test.ts`
Expected: FAIL because scoring is not implemented or not stable.

**Step 3: Implement scoring**

Add a `scoreCandidate()` helper using the design document’s weighted criteria:

- keyword match
- idea seed relevance
- orientation alignment
- anti-solutionism bonus
- context fit
- redundancy penalty

Keep the score deterministic and bounded.

**Step 4: Implement top-N selection**

Return the top 5 or 6 candidates only.

**Step 5: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/tensionCandidates.test.ts`
Expected: PASS

**Step 6: Run combined tests**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/tensionSignals.test.ts src/utils/tensionCandidates.test.ts src/utils/guidedFraming.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/utils/tensionCandidates.ts backend/src/utils/tensionCandidates.test.ts backend/src/utils/guidedFraming.ts
git commit -m "feat: score and rank tension candidates"
```

## Task 5: Replace Placeholder Tension Logic In Guided Expansion

**Files:**
- Modify: `backend/src/utils/guidedFraming.ts`
- Modify: `backend/src/skills/guidedExpansionGenerator.ts`
- Test: `backend/src/utils/guidedFraming.test.ts`

**Step 1: Write the failing integration test**

Add a test to `backend/src/utils/guidedFraming.test.ts`:

```ts
test("buildGuidedExpansion emits paired tension labels instead of default-assumption placeholders", () => {
    const result = buildGuidedExpansion([
        {
            term: "design fiction",
            active: true,
            orientation: "critical",
            artifact_role: "critique_device",
            weight: 1,
        },
    ]);

    assert.equal(result.tensions.some((item) => item.label.includes("default assumptions")), false);
    assert.equal(result.tensions[0].label.includes(" vs "), true);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: FAIL because old placeholder labels still exist.

**Step 3: Refactor `buildGuidedExpansion()`**

Change it from a single helper that directly maps keywords to options into an orchestrator that:

- extracts signals
- builds structured candidates
- converts top candidates into `GuidedOption[]`
- includes `metadata`

**Step 4: Keep `contexts` and `lenses` stable**

Do not rewrite context and lens logic in this task beyond what is needed for compatibility.

**Step 5: Update `generateGuidedExpansion()` to pass user inputs**

Allow it to pass:

- `ideaSeed`
- selected lens if available
- selected contexts if available
- steering note if available

If the existing route does not yet send all of these, thread what exists now and leave TODO comments only if necessary.

**Step 6: Run tests**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts src/utils/tensionSignals.test.ts src/utils/tensionCandidates.test.ts`
Expected: PASS

**Step 7: Run backend verification**

Run: `cd backend && npm run typecheck`
Expected: PASS

Run: `cd backend && npm run build`
Expected: PASS

**Step 8: Commit**

```bash
git add backend/src/utils/guidedFraming.ts backend/src/skills/guidedExpansionGenerator.ts backend/src/utils/guidedFraming.test.ts
git commit -m "feat: replace placeholder tension generation"
```

## Task 6: Add Constrained LLM Rewrite Layer

**Files:**
- Create: `backend/src/skills/tensionRewriter.ts`
- Create: `backend/src/skills/tensionRewriter.test.ts`
- Modify: `backend/src/skills/guidedExpansionGenerator.ts`
- Modify: `backend/src/services/llmService.ts`

**Step 1: Write the failing rewrite test**

Create `backend/src/skills/tensionRewriter.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseRewrittenTensions } from "./tensionRewriter.js";

test("parseRewrittenTensions preserves candidate identity", () => {
    const result = parseRewrittenTensions(JSON.stringify({
        tensions: [
            {
                id: "candidate-1",
                label: "standardized waking norms vs situated temporal experience",
                rationale: "Frames the conflict between normative schedules and lived time.",
            },
        ],
    }));

    assert.equal(result[0].id, "candidate-1");
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/skills/tensionRewriter.test.ts`
Expected: FAIL because the file does not exist.

**Step 3: Implement the rewrite parser and prompt builder**

Create:

- `buildTensionRewritePrompt()`
- `parseRewrittenTensions()`
- `rewriteTensionCandidates()`

The prompt must explicitly instruct the model:

- do not invent new tensions
- only rewrite provided candidates
- preserve the original candidate `id`
- keep wording research-oriented
- avoid product pitch language

**Step 4: Wire rewrite into `generateGuidedExpansion()`**

Use the LLM rewrite only on the top 3 candidates.

If the LLM call fails, fall back to deterministic `draftLabel` and `rationale`.

**Step 5: Run tests**

Run: `cd backend && ./node_modules/.bin/tsx --test src/skills/tensionRewriter.test.ts`
Expected: PASS

**Step 6: Run backend verification**

Run: `cd backend && npm run typecheck`
Expected: PASS

Run: `cd backend && npm run build`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/skills/tensionRewriter.ts backend/src/skills/tensionRewriter.test.ts backend/src/skills/guidedExpansionGenerator.ts backend/src/services/llmService.ts
git commit -m "feat: add tension rewrite layer"
```

## Task 7: Thread Tension Metadata Through Route Responses

**Files:**
- Modify: `backend/src/routes/framing.ts`
- Modify: `frontend/src/types/framing.ts`
- Modify: `frontend/src/components/ChatPanel.tsx`
- Test: `frontend/src/docs/react-ui-architecture.md`

**Step 1: Write the failing contract note**

Update `frontend/src/docs/react-ui-architecture.md` with the new shape of tension cards:

- label
- rationale
- metadata.patternType
- metadata.score

This locks the expected contract before coding.

**Step 2: Update route payload threading**

Ensure `/api/framing/expand` returns richer tension options without breaking current frontend selection behavior.

**Step 3: Update frontend tolerance**

Keep the existing card UI unchanged for students, but make sure TypeScript accepts the richer tension payload.

Optional: log metadata in development if useful, but do not expose debug fields in the student UI yet.

**Step 4: Run frontend verification**

Run: `cd frontend && npm run lint`
Expected: PASS

Run: `cd frontend && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/routes/framing.ts frontend/src/types/framing.ts frontend/src/components/ChatPanel.tsx frontend/src/docs/react-ui-architecture.md
git commit -m "feat: thread tension metadata through expansion"
```

## Task 8: Add End-To-End Quality Checks And Fallback Scenarios

**Files:**
- Modify: `docs/plans/2026-03-16-tension-generation-design.md`
- Modify: `README.md`
- Modify: `backend/src/utils/guidedFraming.test.ts`

**Step 1: Add scenario tests**

Extend `backend/src/utils/guidedFraming.test.ts` with at least these cases:

1. `time + routine + ethnography`
Expected: tension includes normative systems vs lived rhythms style output

2. `AI + education + critique_device`
Expected: tension includes functional logic vs interpretive inquiry style output

3. sparse keyword coverage
Expected: system still returns at least one reasonable fallback tension

4. LLM failure
Expected: deterministic labels are returned

**Step 2: Run tests**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts src/utils/tensionSignals.test.ts src/utils/tensionCandidates.test.ts src/skills/tensionRewriter.test.ts`
Expected: PASS

**Step 3: Run full verification**

Run: `cd backend && npm run typecheck`
Expected: PASS

Run: `cd backend && npm run build`
Expected: PASS

Run: `cd frontend && npm run lint`
Expected: PASS

Run: `cd frontend && npm run build`
Expected: PASS

**Step 4: Update docs**

Add a short section to `README.md` or design docs clarifying:

- deterministic-first tension generation
- optional LLM rewrite
- fallback behavior when rewriting fails

**Step 5: Commit**

```bash
git add docs/plans/2026-03-16-tension-generation-design.md README.md backend/src/utils/guidedFraming.test.ts
git commit -m "test: verify tension generation quality and fallback"
```

## Recommended Delivery Order

1. Types
2. Signal extraction
3. Candidate building
4. Scoring and ranking
5. Replace placeholder tension logic
6. Add LLM rewrite
7. Thread metadata through routes
8. Quality verification and docs

## Open Questions To Revisit During Execution

- Should selected student contexts already affect deterministic scoring in phase 1, or can that wait until after baseline quality is validated?
- Should the LLM rewrite happen during `/expand`, during `/directions`, or only for the top tension actually selected by the user?
- Should the system persist `patternType` and `sourceKeywords` anywhere for future curator debugging?
- How aggressively should anti-solutionism be weighted when a project genuinely does need some intervention language?

## Suggested First Pass Scope

If you want the smallest practical implementation first, complete only:

- Task 1
- Task 2
- Task 3
- Task 4
- Task 5

This yields a fully deterministic and much better tension system before any LLM rewrite is introduced.
