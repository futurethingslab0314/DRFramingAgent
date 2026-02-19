---
name: ConstellationKeywordSync
description: >
  Deterministic skill that takes an array of keyword objects and produces
  four derived views: keyword_map_by_orientation, keyword_index,
  epistemic_profile, and artifact_profile.
---

# ConstellationKeywordSync

## Purpose

Pure, deterministic computation — no LLM calls.
Consumes the `keywords` array from shared state and emits the four derived
fields consumed by downstream framing skills.

## Input

```jsonc
{
  "keywords": [
    {
      "term": "string",                       // required
      "orientation": "exploratory | critical | problem_solving | constructive",
      "artifact_role": "probe | critique_device | generative_construct | solution_system | epistemic_mediator",
      "pipeline_role": "rq_trigger | method_bias | contribution_frame | tone_modifier",  // optional
      "weight": 0.0–1.0,   // optional, default 1.0
      "active": true        // optional, default true
    }
  ]
}
```

## Processing Steps

1. **Filter** — keep only keywords where `active !== false`.
2. **keyword_map_by_orientation** — group active terms into four arrays keyed
   by orientation (`exploratory`, `critical`, `problem_solving`, `constructive`).
3. **keyword_index** — map each `term` → `{ orientation, artifact_role, pipeline_role?, weight }`.
   If a term appears more than once, keep the entry with the higher weight.
4. **epistemic_profile** — sum weights per orientation, then normalize to
   sum = 1. If total weight is 0, use `0.25` for each key.
5. **artifact_profile** — sum weights per artifact_role, then normalize to
   sum = 1. If total weight is 0, use `0.2` for each key.
6. **Round** all profile values to 4 decimal places.

## Output

```json
{
  "keyword_map_by_orientation": {
    "exploratory": ["term_a"],
    "critical": [],
    "problem_solving": ["term_b"],
    "constructive": []
  },
  "keyword_index": {
    "term_a": { "orientation": "exploratory", "artifact_role": "probe", "weight": 0.8 },
    "term_b": { "orientation": "problem_solving", "artifact_role": "solution_system", "pipeline_role": "rq_trigger", "weight": 1.0 }
  },
  "epistemic_profile": {
    "exploratory": 0.4444,
    "critical": 0.0000,
    "problem_solving": 0.5556,
    "constructive": 0.0000
  },
  "artifact_profile": {
    "probe": 0.4444,
    "critique_device": 0.0000,
    "generative_construct": 0.0000,
    "solution_system": 0.5556,
    "epistemic_mediator": 0.0000
  }
}
```

## Implementation

See [`constellationKeywordSync.ts`](./constellationKeywordSync.ts).
