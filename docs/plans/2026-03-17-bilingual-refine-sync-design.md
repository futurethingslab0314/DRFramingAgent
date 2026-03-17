# Bilingual Refine Sync Design

## Goal

Make `AI Refine` preserve the user's edits in the currently selected UI language and synchronize the other language accordingly.

## Rules

- The current UI language is the authoritative language.
- The last generated or refined framing result is the baseline.
- When the user clicks `AI Refine`, the system compares the current framing against the baseline.
- Only fields changed in the authoritative language are treated as explicit user revisions.
- If both languages were edited for the same field, the authoritative-language side wins.
- The secondary language is regenerated to stay aligned with the authoritative language.
- If `research_question`, `purpose`, or `method` changes in the authoritative language, the refine step must realign the whole framing package around those new core edits.

## Frontend

- `FramingCard` keeps both `edited` and `baseline` copies of the framing result.
- `AI Refine` sends `{ framing, baseline, authoritative_language }` to the backend.
- After a successful refine, the returned result becomes the new baseline.

## Backend

- Convert `framing` and `baseline` into a bilingual refine payload.
- Detect authoritative-language field changes.
- Detect whether core-field changes require full-package realignment.
- Ask the LLM to:
  - preserve changed authoritative-language fields,
  - fully rewrite the rest of the package when a core field changes,
  - lightly polish the overall package,
  - synchronize the secondary language,
  - return a complete bilingual framing package.
- Preserve `epistemic_profile`, `artifact_profile`, and `interpretation_summary` as-is.

## Verification

- Unit tests cover authoritative diff detection and bilingual response parsing.
- Frontend production build must pass after the new refine request shape is introduced.
