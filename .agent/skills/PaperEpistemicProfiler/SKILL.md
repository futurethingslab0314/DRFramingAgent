---
name: PaperEpistemicProfiler
description: >
  LLM-backed skill that analyses paper metadata (title, abstract, tags) to
  infer epistemic orientation scores, artifact-role tendencies, and suggest
  5-10 candidate keywords for the constellation map.
---

# PaperEpistemicProfiler

## Purpose

Given minimal paper metadata, infers the epistemic stance of the work and
proposes keywords that carry conceptual weight — suitable for injection into
the FramingConstellationBot keyword constellation.

> [!IMPORTANT]
> Suggested keywords must reflect **conceptual contributions**, not generic
> academic terms or stopwords. Each keyword should be meaningful enough to
> influence framing when added to the constellation map.

## Input

| Field | Type | Required |
|---|---|---|
| `title` | `string` | ✓ |
| `abstract` | `string` | ✓ |
| `tags` | `string[]` | optional |
| `year` | `number` | optional |

## Processing Steps

1. **Build system prompt** — instruct the LLM to act as an epistemic
   analysis expert for design research. Define the four orientations
   and five artifact roles with brief descriptions so the model can
   classify accurately.

2. **Build user prompt** — pass title, abstract, tags, and year.

3. **Call LLM** — request structured JSON output.

4. **Validate** —
   - `orientation_estimate` keys sum to 1 (normalise if needed).
   - `artifact_role_estimate` keys sum to 1 (normalise if needed).
   - `suggested_keywords` has 5-10 entries; each has a valid `orientation`,
     `artifact_role`, and `weight` ∈ (0, 1].
   - No duplicate terms; no generic stopwords.

## Output

```json
{
  "orientation_estimate": {
    "exploratory": 0.35,
    "critical": 0.15,
    "problem_solving": 0.20,
    "constructive": 0.30
  },
  "artifact_role_estimate": {
    "probe": 0.25,
    "critique_device": 0.10,
    "generative_construct": 0.30,
    "solution_system": 0.15,
    "epistemic_mediator": 0.20
  },
  "suggested_keywords": [
    {
      "term": "material speculation",
      "orientation": "constructive",
      "artifact_role": "generative_construct",
      "weight": 0.9,
      "notes": "Central framework proposed by the paper"
    }
  ]
}
```

## Implementation

See [`paperEpistemicProfiler.ts`](./paperEpistemicProfiler.ts).
