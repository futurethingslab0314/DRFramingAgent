# Research Context Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current keyword-to-card `Possible Contexts` placeholder logic with a setting-first, idea-seed-aware research context generation pipeline that produces more meaningful student-facing context cards.

**Architecture:** Build the new context system in three layers: context signal extraction, deterministic context candidate generation, and ranking/selection. The first version should stay rule-based and implementation-safe, with `ideaSeed` and constellation both influencing output, but with top-ranked contexts biased toward concrete settings and topic relevance. The current `GuidedExpansion.contexts` field stays intact, while metadata and generation logic become richer underneath.

**Tech Stack:** TypeScript, Node.js, existing backend utility pattern in `backend/src/utils`, shared schema in `backend/src/schema` and `frontend/src/schema`, backend route flow in `backend/src/routes/framing.ts`, frontend rendering in `frontend/src/components/ChatPanel.tsx`, tests via `tsx --test`.

---

### Task 1: Add structured research-context data types

**Files:**
- Modify: `backend/src/schema/framingConstellationBot.ts`
- Modify: `frontend/src/schema/framingConstellationBot.ts`
- Modify: `frontend/src/types/framing.ts`

**Step 1: Write the failing test**

Add a schema-level expectation in a backend test file that verifies a generated context card can carry metadata for context type and score.

```ts
assert.deepEqual(context.metadata, {
  contextType: "setting_oriented",
  sourceKeywords: ["design education"],
  sourceOrientation: "constructive",
  score: 0.82,
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: FAIL because `GuidedOption.metadata` only supports tension metadata today.

**Step 3: Write minimal implementation**

Extend the shared schema with context-specific types.

```ts
export type ContextType =
  | "setting_oriented"
  | "research_frame";

export interface ContextMetadata {
  contextType: ContextType;
  sourceKeywords: string[];
  sourceOrientation?: Orientation;
  score: number;
}

export interface StructuredContextCandidate {
  id: string;
  label: string;
  rationale: string;
  contextType: ContextType;
  sourceKeywords: string[];
  sourceOrientation?: Orientation;
  score: number;
}

export interface GuidedOption {
  id: string;
  label: string;
  rationale: string;
  metadata?: TensionMetadata | ContextMetadata;
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: PASS or move to the next missing implementation error.

**Step 5: Commit**

```bash
git add backend/src/schema/framingConstellationBot.ts frontend/src/schema/framingConstellationBot.ts frontend/src/types/framing.ts
git commit -m "feat: add structured research context schema"
```

### Task 2: Build context signal extraction

**Files:**
- Create: `backend/src/utils/contextSignals.ts`
- Create: `backend/src/utils/contextSignals.test.ts`

**Step 1: Write the failing test**

Create tests that verify context signals are extracted from both `ideaSeed` and active keywords.

```ts
it("extracts actors, activities, settings, and topic anchors from the idea seed", () => {
  const signalSet = extractContextSignals({
    ideaSeed: "I want to build a conversational agent for design students to rehearse design pitches",
    keywords: [
      { term: "design education", orientation: "constructive", artifact_role: "epistemic_mediator", weight: 1, active: true },
    ],
  });

  expect(signalSet.actorCues).toContain("students");
  expect(signalSet.activityCues).toContain("pitch");
  expect(signalSet.domainCues).toContain("design");
  expect(signalSet.topicAnchors).toContain("agent");
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextSignals.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Create a small signal extractor with explicit buckets.

```ts
export interface ContextSignalSet {
  dominantOrientation?: Orientation;
  weightedKeywords: WeightedKeywordSignal[];
  actorCues: string[];
  activityCues: string[];
  settingCues: string[];
  domainCues: string[];
  artifactCues: string[];
  topicAnchors: string[];
}

export function extractContextSignals(input: { ideaSeed: string; keywords: Keyword[] }): ContextSignalSet {
  const tokens = tokenize(input.ideaSeed);

  return {
    dominantOrientation: inferDominantOrientation(weightedKeywords),
    weightedKeywords,
    actorCues: matchCue(tokens, ACTOR_CUES),
    activityCues: matchCue(tokens, ACTIVITY_CUES),
    settingCues: matchCue(tokens, SETTING_CUES),
    domainCues: matchCue(tokens, DOMAIN_CUES),
    artifactCues: matchCue(tokens, ARTIFACT_CUES),
    topicAnchors: unique([...tokens, ...topKeywordTokens]).slice(0, 12),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextSignals.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/utils/contextSignals.ts backend/src/utils/contextSignals.test.ts
git commit -m "feat: extract research context signals"
```

### Task 3: Build deterministic context candidates

**Files:**
- Create: `backend/src/utils/contextCandidates.ts`
- Create: `backend/src/utils/contextCandidates.test.ts`
- Reference: `backend/src/utils/contextSignals.ts`

**Step 1: Write the failing test**

Create tests for the two target output families: setting-oriented and research-frame contexts.

```ts
it("builds setting-first context candidates from activity and actor cues", () => {
  const signalSet = fakeContextSignals({
    actorCues: ["students"],
    activityCues: ["pitch", "rehearse"],
    domainCues: ["design"],
    artifactCues: ["agent"],
    dominantOrientation: "constructive",
  });

  const candidates = buildStructuredContextCandidates({
    ideaSeed: "design students rehearse pitches with a conversational agent",
    signalSet,
  });

  expect(candidates[0]?.contextType).toBe("setting_oriented");
  expect(candidates.some((candidate) => candidate.label.includes("design students"))).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextCandidates.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Create a deterministic pattern library that can synthesize context labels.

```ts
const SETTING_PATTERNS = [
  ({ actors, activities, domains }) =>
    actors.length && activities.length && domains.length
      ? `classroom settings where ${domains[0]} ${actors[0]} ${activities[0]}`
      : undefined,
  ({ domains, activities }) =>
    domains.length && activities.length
      ? `${domains[0]} studio critique sessions focused on ${activities[0]}`
      : undefined,
];

const RESEARCH_FRAME_PATTERNS = [
  ({ domains, artifacts }) =>
    domains.length && artifacts.length
      ? `${titleCase(artifacts[0])}-mediated ${domains[0]} learning`
      : undefined,
];
```

Return `StructuredContextCandidate[]` with `contextType`, `sourceKeywords`, `sourceOrientation`, and `score`.

**Step 4: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextCandidates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/utils/contextCandidates.ts backend/src/utils/contextCandidates.test.ts
git commit -m "feat: add deterministic research context candidates"
```

### Task 4: Add context scoring, ranking, and guardrails

**Files:**
- Modify: `backend/src/utils/contextCandidates.ts`
- Modify: `backend/src/utils/contextCandidates.test.ts`
- Reference: `backend/src/utils/tensionCandidates.ts`

**Step 1: Write the failing test**

Add tests that enforce the intended ranking rule: top contexts should stay close to the idea seed and concrete settings should outrank abstract research frames.

```ts
it("ranks concrete settings ahead of abstract frames for the top results", () => {
  const candidates = buildStructuredContextCandidates({
    ideaSeed: "a conversational agent for design students to practice pitch presentations",
    signalSet: fakeContextSignals({
      actorCues: ["students"],
      activityCues: ["practice", "pitch"],
      domainCues: ["design"],
      artifactCues: ["agent"],
      topicAnchors: ["design", "students", "pitch", "agent"],
      dominantOrientation: "constructive",
    }),
  });

  expect(candidates[0]?.contextType).toBe("setting_oriented");
  expect(candidates[0]?.label).toContain("students");
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextCandidates.test.ts`
Expected: FAIL because candidates are unsorted or abstract frames can still lead.

**Step 3: Write minimal implementation**

Add explicit scoring and penalties.

```ts
function scoreCandidate(candidate: StructuredContextCandidate, signalSet: ContextSignalSet): number {
  const topicAnchorScore = overlapScore(candidate.label, signalSet.topicAnchors);
  const settingBonus = candidate.contextType === "setting_oriented" ? 0.2 : 0;
  const actorActivityBonus = hasActorAndActivity(candidate.label, signalSet) ? 0.15 : 0;
  const driftPenalty = topicAnchorScore < 0.15 ? 0.2 : 0;

  return clamp(topicAnchorScore + settingBonus + actorActivityBonus - driftPenalty, 0, 1);
}
```

Guardrails:
- Top 1-3 should prefer `setting_oriented`
- `research_frame` candidates can appear later
- candidates with near-zero topic-anchor overlap should be dropped

**Step 4: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextCandidates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/utils/contextCandidates.ts backend/src/utils/contextCandidates.test.ts
git commit -m "feat: rank research contexts with setting-first guardrails"
```

### Task 5: Replace the current placeholder context logic in guided framing

**Files:**
- Modify: `backend/src/utils/guidedFraming.ts`
- Modify: `backend/src/utils/guidedFraming.test.ts`
- Reference: `backend/src/utils/contextSignals.ts`
- Reference: `backend/src/utils/contextCandidates.ts`

**Step 1: Write the failing test**

Add a guided-framing test asserting that contexts no longer mirror raw keyword terms.

```ts
it("builds research contexts from the idea seed instead of echoing raw keywords", () => {
  const expansion = buildGuidedExpansion(
    [
      { term: "design education", orientation: "constructive", artifact_role: "epistemic_mediator", weight: 1, active: true },
      { term: "critique culture", orientation: "critical", artifact_role: "critique_device", weight: 0.8, active: true },
    ],
    { ideaSeed: "conversational agent for design students to practice design pitches" },
  );

  expect(expansion.contexts[0]?.label).not.toBe("design education");
  expect(expansion.contexts[0]?.metadata?.contextType).toBe("setting_oriented");
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: FAIL because contexts still come from `activeKeywords.slice(0, 6)`.

**Step 3: Write minimal implementation**

Replace the current `contexts` block inside `buildGuidedExpansion`.

```ts
const contextSignalSet = extractContextSignals({
  ideaSeed: options?.ideaSeed ?? activeKeywords.map((keyword) => keyword.term).join(" "),
  keywords: activeKeywords,
});

const contextCandidates = buildStructuredContextCandidates({
  ideaSeed: options?.ideaSeed ?? activeKeywords.map((keyword) => keyword.term).join(" "),
  signalSet: contextSignalSet,
});

const contexts = dedupeById(
  contextCandidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    rationale: candidate.rationale,
    metadata: {
      contextType: candidate.contextType,
      sourceKeywords: candidate.sourceKeywords,
      sourceOrientation: candidate.sourceOrientation,
      score: candidate.score,
    },
  })),
);
```

**Step 4: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts src/utils/contextSignals.test.ts src/utils/contextCandidates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/utils/guidedFraming.ts backend/src/utils/guidedFraming.test.ts
git add backend/src/utils/contextSignals.ts backend/src/utils/contextSignals.test.ts backend/src/utils/contextCandidates.ts backend/src/utils/contextCandidates.test.ts
git commit -m "feat: replace placeholder research contexts"
```

### Task 6: Thread context metadata through guided expansion generation

**Files:**
- Modify: `backend/src/skills/guidedExpansionGenerator.ts`
- Modify: `backend/src/routes/framing.ts`
- Modify: `frontend/src/api/framing.ts`
- Modify: `frontend/src/components/ChatPanel.tsx`
- Modify: `frontend/src/i18n/messages.ts`

**Step 1: Write the failing test**

Add a backend or frontend expectation that context cards preserve their richer rationale/metadata through the API boundary.

```ts
expect(expansion.contexts[0]).toMatchObject({
  label: expect.stringContaining("settings"),
  metadata: { contextType: "setting_oriented" },
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
Expected: FAIL if metadata is dropped or not threaded.

**Step 3: Write minimal implementation**

Keep the route shape the same, but ensure new metadata reaches the frontend. Update UI labels if needed so setting-oriented contexts can optionally be visually distinguished later.

```ts
type GuidedOption = {
  id: string;
  label: string;
  rationale: string;
  metadata?: {
    contextType?: "setting_oriented" | "research_frame";
    score?: number;
  };
};
```

Do not redesign the UI yet. Just make the data available.

**Step 4: Run test to verify it passes**

Run:
- `cd backend && ./node_modules/.bin/tsx --test src/utils/guidedFraming.test.ts`
- `cd backend && npm run typecheck`
- `cd frontend && npm run lint`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/skills/guidedExpansionGenerator.ts backend/src/routes/framing.ts frontend/src/api/framing.ts frontend/src/components/ChatPanel.tsx frontend/src/i18n/messages.ts
git commit -m "feat: thread research context metadata through guided expansion"
```

### Task 7: Add safe fallbacks for sparse constellation coverage

**Files:**
- Modify: `backend/src/utils/contextSignals.ts`
- Modify: `backend/src/utils/contextCandidates.ts`
- Modify: `backend/src/utils/contextCandidates.test.ts`
- Modify: `backend/src/skills/guidedExpansionGenerator.ts`

**Step 1: Write the failing test**

Add a case where the idea seed is sparse and keywords are weak, but the system still returns at least one usable context.

```ts
it("falls back to an idea-seed-anchored context when signals are sparse", () => {
  const candidates = buildStructuredContextCandidates({
    ideaSeed: "tool for design students",
    signalSet: fakeContextSignals({
      topicAnchors: ["tool", "design", "students"],
      actorCues: ["students"],
      domainCues: ["design"],
    }),
  });

  expect(candidates.length).toBeGreaterThan(0);
  expect(candidates[0]?.label.toLowerCase()).toContain("students");
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextCandidates.test.ts`
Expected: FAIL if no candidate is generated.

**Step 3: Write minimal implementation**

Add conservative fallbacks such as:

```ts
if (candidates.length === 0 && signalSet.domainCues.length > 0) {
  candidates.push({
    id: "context-fallback-domain-setting",
    label: `${signalSet.domainCues[0]} learning settings`,
    rationale: "Use a domain-anchored setting when context signals are sparse.",
    contextType: "setting_oriented",
    sourceKeywords: signalSet.weightedKeywords.slice(0, 2).map((keyword) => keyword.term),
    sourceOrientation: signalSet.dominantOrientation,
    score: 0.3,
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextCandidates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/utils/contextSignals.ts backend/src/utils/contextCandidates.ts backend/src/utils/contextCandidates.test.ts backend/src/skills/guidedExpansionGenerator.ts
git commit -m "feat: add sparse-signal fallbacks for research contexts"
```

### Task 8: Add optional LLM rewrite seam without enabling it by default

**Files:**
- Create: `backend/src/services/contextRewriter.ts`
- Modify: `backend/src/skills/guidedExpansionGenerator.ts`
- Modify: `backend/src/utils/contextCandidates.test.ts`
- Modify: `backend/src/utils/guidedFraming.test.ts`

**Step 1: Write the failing test**

Write a unit test that verifies a rewriter can post-process deterministic labels while preserving context type and topic anchors.

```ts
it("can rewrite context wording without changing context type", async () => {
  const rewritten = await rewriteContextCandidates([
    {
      id: "context-1",
      label: "design classroom settings where students rehearse pitches",
      contextType: "setting_oriented",
      sourceKeywords: ["design education"],
      score: 0.8,
      rationale: "Deterministic candidate",
    },
  ]);

  expect(rewritten[0]?.contextType).toBe("setting_oriented");
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && ./node_modules/.bin/tsx --test src/utils/contextCandidates.test.ts src/utils/guidedFraming.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Create a no-op or feature-flagged seam first.

```ts
export async function rewriteContextCandidates(
  candidates: StructuredContextCandidate[],
): Promise<StructuredContextCandidate[]> {
  return candidates;
}
```

Wire it only if the guided expansion pipeline is ready for async behavior later. If async refactoring is too large for this iteration, stop at the seam and document it.

**Step 4: Run test to verify it passes**

Run:
- `cd backend && ./node_modules/.bin/tsx --test src/utils/contextCandidates.test.ts src/utils/guidedFraming.test.ts`
- `cd backend && npm run typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/contextRewriter.ts backend/src/skills/guidedExpansionGenerator.ts backend/src/utils/contextCandidates.test.ts backend/src/utils/guidedFraming.test.ts
git commit -m "chore: add research context rewrite seam"
```

### Task 9: Verify the full guided expansion behavior

**Files:**
- Test: `backend/src/utils/contextSignals.test.ts`
- Test: `backend/src/utils/contextCandidates.test.ts`
- Test: `backend/src/utils/guidedFraming.test.ts`
- Test: `frontend/src/components/ChatPanel.tsx` if UI assertions exist

**Step 1: Run the focused backend test suite**

Run:

```bash
cd backend && ./node_modules/.bin/tsx --test src/utils/contextSignals.test.ts src/utils/contextCandidates.test.ts src/utils/guidedFraming.test.ts
```

Expected: PASS

**Step 2: Run backend typecheck and build**

Run:

```bash
cd backend && npm run typecheck
cd backend && npm run build
```

Expected: PASS

**Step 3: Run frontend validation**

Run:

```bash
cd frontend && npm run lint
cd frontend && npm run build
```

Expected: PASS

**Step 4: Manual QA**

Verify these example inputs in the app:
- `I want to build a conversational agent for design students to rehearse design pitches`
- `How might we make subjective time visible in remote collaboration`
- `Tools for helping students reflect on critique sessions`

Expected behavior:
- top contexts are concrete settings, not raw keywords
- research-frame contexts can still appear, but later
- context cards stay visibly related to the idea seed

**Step 5: Commit**

```bash
git add backend/src utils frontend/src
git commit -m "test: verify research context generation end to end"
```

## Recommended MVP stopping point

If you want the smallest valuable first release, stop after **Task 7**.

That gets you:
- structured context metadata
- signal extraction
- deterministic context candidates
- setting-first ranking
- placeholder replacement in guided expansion
- safe fallbacks for sparse ideas

Task 8 is optional and should only happen after deterministic outputs are stable and reviewable.
