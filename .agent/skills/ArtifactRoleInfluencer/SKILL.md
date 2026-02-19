---
name: ArtifactRoleInfluencer
description: >
  Deterministic skill that translates dominant artifact roles into framing
  biases — steering RQ grammar, method logic, result framing, contribution
  claims, and tonal lexicon.
---

# ArtifactRoleInfluencer

## Purpose

Pure, deterministic computation — no LLM calls.
Reads the four derived views produced by **ConstellationKeywordSync** and
outputs a `framing_bias` object that downstream LLM prompts can inject
directly into their system messages.

## Input

| Field | Type | Source |
|---|---|---|
| `artifact_profile` | `ArtifactProfile` | ConstellationKeywordSync |
| `epistemic_profile` | `EpistemicProfile` | ConstellationKeywordSync |
| `keyword_map_by_orientation` | `KeywordMapByOrientation` | ConstellationKeywordSync |
| `keyword_index` | `KeywordIndex` | ConstellationKeywordSync |

## Artifact-Role → Framing Mapping

| Role | background / purpose slant | RQ grammar | Method bias | Result bias | Contribution bias | Tone lexicon |
|---|---|---|---|---|---|---|
| **probe** | surface / reveal patterns | open-ended inquiry | qualitative exploration, thematic analysis | insights, reframings | new lens, sensitising concept | reveal, surface, illuminate, uncover |
| **critique_device** | challenge / destabilise | expose ideology | critical discourse analysis, deconstruction | alternative framing, counter-narrative | repositioning the discourse | challenge, destabilise, expose, interrogate |
| **generative_construct** | develop / construct / propose | framework / model / system logic | constructive design research, RtD | novel framework, design space | new model, generative theory | construct, develop, propose, synthesise |
| **solution_system** | functional improvement | evaluation | user studies, A/B testing, benchmarking | measurable outcomes | validated solution, design guideline | improve, optimise, evaluate, validate |
| **epistemic_mediator** | bridge theory and lived experience | RtD / material inquiry | participatory methods, autoethnography | translation, mediation | connecting knowledge domains | bridge, translate, mediate, negotiate |

## Processing Steps

1. **Rank** artifact roles by their profile weight (descending).
2. **Select dominant** — the top role (or top-2 if the second is ≥ 0.8× the first).
3. **Look up** the mapping rows for each dominant role.
4. **Merge** into a single `framing_bias` object:
   - `background_bias` / `purpose_bias` — concatenate with "; " if two dominants.
   - Array fields — union of both rows' entries.
5. **Enrich `tone_lexicon`** — append any terms from `keyword_map_by_orientation`
   whose `keyword_index` entry has a `pipeline_role === "tone_modifier"`.

## Output

```json
{
  "framing_bias": {
    "background_bias": "surface / reveal patterns",
    "purpose_bias": "open-ended inquiry",
    "rq_grammar_templates": ["How does …", "In what ways …"],
    "method_bias": ["qualitative exploration", "thematic analysis"],
    "result_bias": ["insights", "reframings"],
    "contribution_bias": ["new lens", "sensitising concept"],
    "tone_lexicon": ["reveal", "surface", "illuminate", "uncover"]
  }
}
```

## Implementation

See [`artifactRoleInfluencer.ts`](./artifactRoleInfluencer.ts).
