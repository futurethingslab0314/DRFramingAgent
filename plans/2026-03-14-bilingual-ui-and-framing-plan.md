# Bilingual UI And Framing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add site-wide English/Chinese UI switching while upgrading framing generation, display, and Notion persistence so framing results are always stored and shown in both English and Traditional Chinese.

**Architecture:** The frontend will gain a lightweight i18n layer with a global language state and shared translation dictionary. The backend will upgrade the framing result model from English-only core fields to bilingual field objects, preserve the current English-first generation flow, and add a second bilingual generation step that produces Traditional Chinese versions for title and the six framing fields before saving both languages into Notion DB1.

**Tech Stack:** React 19, TypeScript, Vite, Express, OpenAI chat completions, Notion API, existing framing pipeline skills

---

## Requirements Summary

Confirmed product requirements:

- The website must allow switching between English and Chinese UI.
- When the UI is switched to Chinese, all visible interface text should be Chinese.
- When the UI is switched to English, all visible interface text should be English.
- Framing results must always be bilingual, regardless of UI language.
- Notion uploads must always store bilingual framing content.
- Notion DB1 now includes six Chinese fields:
  - `Research Question ZH`
  - `Background ZH`
  - `Purpose ZH`
  - `Method ZH`
  - `Result ZH`
  - `Contribution ZH`

## Design Decisions

### 1. UI language is presentation-only

The selected site language affects:

- navigation labels
- page headers
- button text
- field labels
- helper text
- loading states
- status messages

The selected site language does not affect whether framing content is bilingual. Bilingual framing content always exists and is always shown.

### 2. Framing data becomes bilingual-first

Current framing data is inconsistent:

- title is single-language
- six core fields are single-language
- abstracts are already bilingual but stored as separate top-level fields

Target model:

```ts
interface BilingualText {
    en: string;
    zh: string;
}

interface FramingRunResponse {
    title: BilingualText;
    research_question: BilingualText;
    background: BilingualText;
    purpose: BilingualText;
    method: BilingualText;
    result: BilingualText;
    contribution: BilingualText;
    abstract: BilingualText;
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;
}
```

This keeps the response internally consistent and avoids special cases for abstracts.

### 3. Backend generation remains English-first

Recommended generation strategy:

1. keep existing English framing generation logic
2. keep existing bilingual abstract generation logic, but adapt it to the new data model
3. add a new bilingual generation step for:
   - `title.zh`
   - `research_question.zh`
   - `background.zh`
   - `purpose.zh`
   - `method.zh`
   - `result.zh`
   - `contribution.zh`

Reason:

- this minimizes disruption to the current framing pipeline
- English framing quality stays anchored in the existing prompts
- Chinese content is still model-generated and should be idiomatic, not just UI-side translation

### 4. Notion persistence mirrors the bilingual model

English content goes to the existing DB1 fields.

Chinese content goes to:

- `Research Question ZH`
- `Background ZH`
- `Purpose ZH`
- `Method ZH`
- `Result ZH`
- `Contribution ZH`

Title handling:

- keep the Notion `Title` property as the English title for now, unless a dedicated Chinese title field is added later
- if future requirements need Chinese title persistence in Notion, add a `Title ZH` field in a later pass

## Architecture Changes

## Frontend

### New i18n layer

Add a very small internal i18n system rather than a full dependency:

- `frontend/src/i18n/messages.ts`
- `frontend/src/i18n/I18nContext.tsx`

Recommended shape:

```ts
type Language = "en" | "zh";

interface I18nValue {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}
```

Use a typed message dictionary with stable string keys.

### Global language switch

Language state should live near the app shell and be accessible everywhere.

Recommended:

- create `I18nProvider`
- wrap the app in [frontend/src/main.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/main.tsx)
- add a small toggle in [frontend/src/App.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/App.tsx)

Optional persistence:

- store the language in `localStorage`
- default to `en` if no stored preference exists

### Bilingual framing rendering

Update [frontend/src/components/FramingCard.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/FramingCard.tsx) so each section shows:

- English block
- Traditional Chinese block

Recommended presentation:

- keep a single conceptual section per field
- inside it show `EN` and `中文` subareas
- keep both editable

This avoids duplicating the whole field list twice.

### Pages/components requiring translation coverage

Minimum pass:

- [frontend/src/App.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/App.tsx)
- [frontend/src/pages/FramingPage.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/pages/FramingPage.tsx)
- [frontend/src/pages/ConstellationPage.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/pages/ConstellationPage.tsx)
- [frontend/src/components/ChatPanel.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ChatPanel.tsx)
- [frontend/src/components/FramingCard.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/FramingCard.tsx)
- [frontend/src/components/KeywordInspector.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/KeywordInspector.tsx)
- [frontend/src/components/ZoteroIngest.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ZoteroIngest.tsx)

Stretch pass if time allows:

- [frontend/src/components/EpistemicSummary.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/EpistemicSummary.tsx)
- [frontend/src/components/ConstellationCanvas.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ConstellationCanvas.tsx)

## Backend

### New bilingual field type

Add a shared helper type:

```ts
export interface BilingualText {
    en: string;
    zh: string;
}
```

Use it in:

- backend framing result types
- frontend framing response types
- Notion save input types

### New generation step

Add a new skill:

- `backend/src/skills/bilingualFramingLocalizer.ts`

Responsibilities:

- accept English title and six English framing fields
- generate Traditional Chinese versions of:
  - title
  - research question
  - background
  - purpose
  - method
  - result
  - contribution
- preserve academic tone
- return JSON only

This step should not regenerate the English fields.

### Pipeline placement

Current order:

1. `constellationKeywordSync`
2. `artifactRoleInfluencer`
3. `constellationRuleEngine`
4. `framingGeneratorMVP`
5. `constellationAbstractGenerator`
6. `titleGenerator`

Recommended new order:

1. `constellationKeywordSync`
2. `artifactRoleInfluencer`
3. `constellationRuleEngine`
4. `framingGeneratorMVP` -> English six fields
5. `constellationAbstractGenerator` -> bilingual abstract
6. `titleGenerator` -> English title
7. `bilingualFramingLocalizer` -> Chinese title + Chinese six fields

Why after `titleGenerator`:

- the localizer can translate/localize the final English framing package
- no extra upstream reasoning changes are needed

### Refine API upgrade

The current `/api/framing/refine` route assumes English-only core fields plus bilingual abstracts.

New behavior should refine bilingual framing content:

- either refine both languages in one step
- or refine English fields and regenerate/update Chinese fields afterwards

Recommended first version:

- refine English fields
- keep bilingual abstract fields
- rerun bilingual localizer for the six core fields and title

This keeps the refine flow aligned with the generation flow.

## Data Model Changes

### Backend types

Update:

- [backend/src/pipeline/runPipeline.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/pipeline/runPipeline.ts)
- [backend/src/schema/framingConstellationBot.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/schema/framingConstellationBot.ts)
- [backend/src/services/notionService.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/services/notionService.ts)

### Frontend types

Update:

- [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts)
- [frontend/src/api/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/api/framing.ts)
- [frontend/src/schema/frontendContractSpec.json](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/schema/frontendContractSpec.json)

## Notion DB1 Mapping

Add these DB1 constants in [backend/src/services/notionService.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/services/notionService.ts):

- `RESEARCH_QUESTION_ZH`
- `BACKGROUND_ZH`
- `PURPOSE_ZH`
- `METHOD_ZH`
- `RESULT_ZH`
- `CONTRIBUTION_ZH`

Save behavior:

- English title -> `Title`
- English core fields -> existing English properties
- Chinese core fields -> new `... ZH` properties
- `abstract.en` -> `Abstract EN`
- `abstract.zh` -> `Abstract ZH`

## Risks And Mitigations

### Risk 1: Large response/model churn

Changing the framing response shape will affect many files.

Mitigation:

- centralize shared types early
- do type updates before UI changes

### Risk 2: Chinese localization quality is weak

Mitigation:

- generate Chinese with an explicit academic Traditional Chinese prompt
- do not rely on naive UI translation

### Risk 3: UI translation coverage is incomplete

Mitigation:

- make a clear list of components to localize
- verify Chinese UI manually page-by-page

### Risk 4: Refine flow becomes inconsistent

Mitigation:

- treat refine as an English refinement plus Chinese regeneration step
- keep both language outputs in sync

### Risk 5: Notion property mismatch

Mitigation:

- hardcode the exact confirmed property names
- fail loudly if properties do not exist

## Testing Strategy

### Backend verification

- bilingual localizer returns all expected keys
- pipeline returns bilingual title and six bilingual fields
- save route writes both English and Chinese fields without shape errors
- refine route returns the upgraded bilingual structure

### Frontend verification

- app builds cleanly with new bilingual response types
- lint passes after introducing i18n context/hooks
- toggling language updates all main UI labels
- framing result area still renders and edits correctly

### Manual verification scenarios

1. Switch UI to English and confirm main pages are fully English
2. Switch UI to Chinese and confirm main pages are fully Chinese
3. Run framing in either UI language and confirm results show both EN and ZH
4. Edit bilingual framing fields and save to Notion
5. Confirm Notion contains English fields, Chinese fields, and bilingual abstract

## Implementation Tasks

### Task 1: Define shared bilingual framing types

**Files:**
- Modify: [frontend/src/types/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/types/framing.ts)
- Modify: [frontend/src/schema/frontendContractSpec.json](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/schema/frontendContractSpec.json)
- Modify: [backend/src/schema/framingConstellationBot.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/schema/framingConstellationBot.ts)

**Step 1: Write the failing type-level verification or targeted build failure**

- Update one consumer to expect `BilingualText`
- Run build and confirm it fails on missing shape changes

**Step 2: Add `BilingualText` and upgrade framing response types**

- Convert title and all framing fields to bilingual objects
- Convert abstract to a bilingual object too

**Step 3: Run build to verify type updates surface all affected callsites**

- Use the failures as the work queue for later tasks

### Task 2: Implement backend bilingual framing generation

**Files:**
- Create: `backend/src/skills/bilingualFramingLocalizer.ts`
- Modify: [backend/src/pipeline/runPipeline.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/pipeline/runPipeline.ts)
- Modify: [backend/src/skills/titleGenerator.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/skills/titleGenerator.ts)
- Modify: [backend/src/skills/constellationAbstractGenerator.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/skills/constellationAbstractGenerator.ts)

**Step 1: Write a failing backend test for the bilingual localizer response shape**

- Verify required `zh` keys must exist

**Step 2: Implement the localizer skill**

- Generate Traditional Chinese versions of title and six core fields
- Validate JSON output strictly

**Step 3: Wire it into `runPipeline()`**

- Keep English framing generation intact
- Return bilingual title, bilingual core fields, bilingual abstract

**Step 4: Re-run backend verification**

- Confirm test passes
- Confirm build/typecheck pass

### Task 3: Upgrade Notion persistence and refine flow

**Files:**
- Modify: [backend/src/services/notionService.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/services/notionService.ts)
- Modify: [backend/src/routes/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/routes/framing.ts)

**Step 1: Extend DB1 property constants and save input type**

- Add the six Chinese property names
- Update `FramingResult` input type to bilingual

**Step 2: Update save mapping**

- Save English and Chinese content to the correct properties

**Step 3: Upgrade refine route**

- Accept bilingual framing payload
- refine/regenerate so both languages remain present after refine

**Step 4: Run backend verification**

- Build and typecheck

### Task 4: Add frontend i18n infrastructure

**Files:**
- Create: `frontend/src/i18n/messages.ts`
- Create: `frontend/src/i18n/I18nContext.tsx`
- Modify: [frontend/src/main.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/main.tsx)
- Modify: [frontend/src/App.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/App.tsx)

**Step 1: Write a minimal failing UI expectation**

- A build or small component expectation that requires translated labels

**Step 2: Implement language context and message lookup**

- Support `en` and `zh`
- Add language toggle in the shell

**Step 3: Persist language choice**

- Use `localStorage` if it keeps implementation simple

### Task 5: Localize the main UI surfaces

**Files:**
- Modify: [frontend/src/pages/FramingPage.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/pages/FramingPage.tsx)
- Modify: [frontend/src/pages/ConstellationPage.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/pages/ConstellationPage.tsx)
- Modify: [frontend/src/components/ChatPanel.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ChatPanel.tsx)
- Modify: [frontend/src/components/KeywordInspector.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/KeywordInspector.tsx)
- Modify: [frontend/src/components/ZoteroIngest.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ZoteroIngest.tsx)
- Optionally modify: [frontend/src/components/EpistemicSummary.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/EpistemicSummary.tsx)
- Optionally modify: [frontend/src/components/ConstellationCanvas.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/ConstellationCanvas.tsx)

**Step 1: Replace hardcoded labels with translation keys**

- Start with the main pages and input/result flows

**Step 2: Localize status and empty states**

- Loading text
- Save/refine messages
- Sync/fetch/processing labels

**Step 3: Re-run frontend build/lint**

- Ensure no untranslated or broken callsites remain in the main flow

### Task 6: Render and edit bilingual framing results

**Files:**
- Modify: [frontend/src/components/FramingCard.tsx](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/components/FramingCard.tsx)
- Modify: [frontend/src/api/framing.ts](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/api/framing.ts)

**Step 1: Update editing state to support bilingual fields**

- Each field should track `{ en, zh }`

**Step 2: Redesign each field card**

- Show English and Chinese textareas in the same conceptual section

**Step 3: Update save and refine calls**

- Submit the bilingual result shape cleanly

### Task 7: Full verification

**Files:**
- No permanent additions required unless extra tests are introduced

**Step 1: Backend verification**

Run:

```bash
cd backend
npm run build
npm run typecheck
./node_modules/.bin/tsx --test src/**/*.test.ts
```

**Step 2: Frontend verification**

Run:

```bash
cd frontend
npm run build
npm run lint
```

**Step 3: Manual bilingual checks**

- English UI + bilingual framing
- Chinese UI + bilingual framing
- save to Notion with both languages present
- refine flow preserves bilingual output

## Out Of Scope

- Full third-party i18n framework adoption
- Server-side locale negotiation
- Translating historical Notion entries
- Chinese title persistence in Notion unless a `Title ZH` field is added later

## Recommendation

Implement this as one coordinated feature branch, but execute it in the order above: shared types first, backend bilingual generation second, Notion persistence third, UI i18n fourth, bilingual result rendering last. The main risk is shape churn across frontend and backend, so type-first sequencing will keep the work controllable.
