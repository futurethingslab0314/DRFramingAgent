---
name: TitleGenerator
description: >
  LLM-backed skill that synthesizes FramingGeneratorMVP output,
  ConstellationAbstractGenerator abstracts, and ConstellationKeywordSync keyword
  signals to generate one concise, publication-ready design research paper title.
---

# TitleGenerator

## Purpose

Generates a single academic title suitable for a design research paper by
combining framing fields, bilingual abstracts, and salient keyword signals.

## Input

| Field | Type | Source |
|---|---|---|
| `research_question` | `string` | FramingGeneratorMVP |
| `background` | `string` | FramingGeneratorMVP |
| `purpose` | `string` | FramingGeneratorMVP |
| `method` | `string` | FramingGeneratorMVP |
| `result` | `string` | FramingGeneratorMVP |
| `contribution` | `string` | FramingGeneratorMVP |
| `abstract_en` | `string` | ConstellationAbstractGenerator |
| `abstract_zh` | `string` | ConstellationAbstractGenerator |
| `keyword_map_by_orientation` | `KeywordMapByOrientation` | ConstellationKeywordSync |
| `epistemic_profile` | `EpistemicProfile` | ConstellationKeywordSync |

## Processing Steps

1. **Select salient signals** — rank orientations by epistemic weight and gather
   high-signal keywords from those groups.
2. **Build system prompt** — enforce design-research tone, concision, and
   publication readiness.
3. **Build user prompt** — pass framing, abstracts, and selected keywords.
4. **Call LLM** — request structured JSON.
5. **Validate** — ensure a non-empty `title` string is returned.

## Constraints

- Output exactly one title.
- Keep title concise (roughly 8-18 words).
- Avoid generic filler and marketing language.
- Preserve alignment with method + contribution claims.

## Output

```json
{
  "title": ""
}
```

## Implementation

See [`titleGenerator.ts`](./titleGenerator.ts).
