---
name: KeywordConceptRefiner
description: >
  Deterministic skill for refining large paper-derived keyword sets into a
  conceptual design-research constellation. Use when keywords are noisy,
  domain-specific, duplicated, or overly generic and need filtering, canonical
  merging, and abstraction (e.g., keep privacy/trust/design intervention and
  drop smart home/system-level noise).
---

# KeywordConceptRefiner

## Purpose

Turn a large, noisy keyword list into a compact, conceptual vocabulary for
design research framing.

This skill is designed for situations where extracted terms are too
domain-specific (e.g., `smart home`, `iot platform`, `system`) and you want a
more transferable constellation (e.g., `privacy`, `trust`, `exploration`,
`design fiction`, `design intervention`).

## Input

```jsonc
{
  "keywords": [
    {
      "term": "string",
      "orientation": "exploratory | critical | problem_solving | constructive",
      "artifact_role": "probe | critique_device | generative_construct | solution_system | epistemic_mediator",
      "pipeline_role": "rq_trigger | method_bias | contribution_frame | tone_modifier", // optional
      "weight": 0.0-1.0, // optional, default 1.0
      "active": true,    // optional, default true
      "notes": "string"  // optional
    }
  ],
  "config": {
    "mode": "balanced | conceptual_strict",      // optional, default conceptual_strict
    "max_keywords": 12,                          // optional, default 12
    "min_weight": 0.35,                          // optional, default 0.35
    "keep_domain_terms": ["sleep", "alarm"],     // optional
    "drop_terms": ["system", "platform"],        // optional
    "canonical_overrides": {                     // optional
      "smart homes": "domestic technology",
      "smart home": "domestic technology"
    }
  }
}
```

## Processing Steps

1. **Normalize terms** — lowercase/trim and canonicalize aliases.
2. **Classify each term** — `conceptual`, `methodological`, `domain_specific`, or `generic_noise`.
3. **Filter** —
   - Always drop `generic_noise`.
   - In `conceptual_strict`, drop most `domain_specific` unless explicitly
     whitelisted.
   - Drop terms below `min_weight`.
4. **Merge** by canonical term —
   - Keep max weight.
   - Merge aliases and source terms.
   - Resolve orientation/artifact role by weighted vote.
5. **Rank and cap** —
   - Prioritize `conceptual` and `methodological` terms.
   - Return top `max_keywords`.

## Output

```json
{
  "refined_keywords": [
    {
      "term": "privacy",
      "orientation": "critical",
      "artifact_role": "epistemic_mediator",
      "pipeline_role": "rq_trigger",
      "weight": 0.82,
      "active": true,
      "notes": "merged from: privacy concern, data privacy"
    }
  ],
  "dropped_keywords": [
    { "term": "system", "reason": "generic_noise" },
    { "term": "smart home", "reason": "domain_specific_filtered" }
  ],
  "merge_report": [
    {
      "canonical_term": "domestic technology",
      "merged_from": ["smart home", "smart homes", "iot home device"]
    }
  ]
}
```

## Implementation

See [`keywordConceptRefiner.ts`](./keywordConceptRefiner.ts).
