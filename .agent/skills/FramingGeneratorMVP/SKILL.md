---
name: FramingGeneratorMVP
description: >
  LLM-backed skill that takes user context and rule-engine output to generate
  a coherent set of framing fields: research_question, background, purpose,
  method, result, and contribution.
---

# FramingGeneratorMVP

## Purpose

Uses a language model to produce concise, coherent framing sentences
that **strictly follow** the reasoning-control object emitted by
ConstellationRuleEngine.

> [!IMPORTANT]
> This is the only skill in the pipeline that calls an LLM.
> All upstream skills are deterministic.

## Input

| Field | Type | Source |
|---|---|---|
| `user_context` | `string` | User-provided design / project description or research intention |
| `rule_engine_output` | `ReasoningControl` | ConstellationRuleEngine |

## Processing Steps

1. **Build system prompt** — inject the rule-engine constraints:
   - `logic_pattern` → overall epistemic stance the LLM must adopt.
   - `rq_templates` → candidate RQ structures the LLM should draw from.
   - `method_logic` → method vocabulary the LLM must reference.
   - `contribution_logic` → contribution framing the LLM must echo.
   - `tone_lexicon` → preferred verbs / adjectives the LLM should weave in.
   - `constraints` → hard guardrails (keyword inclusion, sentence limits).

2. **Build user prompt** — pass `user_context` as the design scenario.

3. **Call LLM** — request structured JSON output.

4. **Validate** — ensure every field is present and within sentence limits.

## Constraints

- Not all RQs must be problem-solving; allow exploratory / meaning-making framings.
- Each field must be concise (1-2 sentences).
- The generator must follow `rule_engine_output` strictly.

## Output

```json
{
  "research_question": "",
  "background": "",
  "purpose": "",
  "method": "",
  "result": "",
  "contribution": ""
}
```

## Implementation

See [`framingGeneratorMVP.ts`](./framingGeneratorMVP.ts).
