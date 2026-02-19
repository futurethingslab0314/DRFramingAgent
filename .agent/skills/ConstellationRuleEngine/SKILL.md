---
name: ConstellationRuleEngine
description: >
  Deterministic skill that fuses epistemic profile, keyword maps, and framing
  bias into a coherent reasoning-control object that downstream generators
  must follow.
---

# ConstellationRuleEngine

## Purpose

Pure, deterministic computation — no LLM calls.
Combines the epistemic stance, keyword constellation, and framing bias
into a single `ReasoningControl` object that constrains downstream
generation (RQ, method, contribution, tone).

## Input

| Field | Type | Source |
|---|---|---|
| `epistemic_profile` | `EpistemicProfile` | ConstellationKeywordSync |
| `keyword_map_by_orientation` | `KeywordMapByOrientation` | ConstellationKeywordSync |
| `keyword_index` | `KeywordIndex` | ConstellationKeywordSync |
| `framing_bias` | `FramingBias` | ArtifactRoleInfluencer |

## Processing Steps

1. **Determine logic_pattern** — select the orientation with the highest
   epistemic-profile weight. Map to a logic pattern string:
   - `exploratory` → `"open_exploration"`
   - `critical` → `"critical_questioning"`
   - `problem_solving` → `"solution_oriented"`
   - `constructive` → `"generative_construction"`
   If there is a tie (within 0.01), hyphenate both (e.g. `"open_exploration-critical_questioning"`).

2. **Build rq_templates** — start with `framing_bias.rq_grammar_templates`,
   then append any `keyword_index` terms whose `pipeline_role === "rq_trigger"`,
   wrapped in the first template (e.g. `"How does {term} …"`).

3. **Build method_logic** — start with `framing_bias.method_bias`, then
   append terms whose `pipeline_role === "method_bias"`.

4. **Build contribution_logic** — start with `framing_bias.contribution_bias`,
   then append terms whose `pipeline_role === "contribution_frame"`.

5. **Build constraints** — generate concise guardrails:
   - Must use ≥ 1 keyword from the dominant orientation.
   - Must not contradict the `logic_pattern`.
   - Sentences must stay within 1–2 sentences per framing field.

6. **Build tone_lexicon** — union of `framing_bias.tone_lexicon` and
   any terms whose `pipeline_role === "tone_modifier"`.

## Output

```json
{
  "logic_pattern": "open_exploration",
  "rq_templates": ["How does …", "In what ways …", "How does empathy …"],
  "method_logic": ["qualitative exploration", "thematic analysis"],
  "contribution_logic": ["new lens", "sensitising concept"],
  "constraints": [
    "Must reference ≥1 keyword from the dominant orientation",
    "Must not contradict the open_exploration logic pattern",
    "Each framing field must be 1-2 sentences"
  ],
  "tone_lexicon": ["reveal", "surface", "illuminate", "uncover"]
}
```

## Implementation

See [`constellationRuleEngine.ts`](./constellationRuleEngine.ts).
