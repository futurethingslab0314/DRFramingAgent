// ═══════════════════════════════════════════════════════════════
// Pipeline runner — wires skills with backend services
// ═══════════════════════════════════════════════════════════════

import { callLLM } from "../services/llmService.js";

import { constellationKeywordSync } from "../skills/constellationKeywordSync.js";
import { artifactRoleInfluencer } from "../skills/artifactRoleInfluencer.js";
import { constellationRuleEngine } from "../skills/constellationRuleEngine.js";
import { framingGeneratorMVP } from "../skills/framingGeneratorMVP.js";
import { constellationAbstractGenerator } from "../skills/constellationAbstractGenerator.js";
import { bilingualFramingLocalizer } from "../skills/bilingualFramingLocalizer.js";
import { interpretContext } from "../skills/interpretContext.js";
import { paperEpistemicProfiler } from "../skills/paperEpistemicProfiler.js";
import { titleGenerator } from "../skills/titleGenerator.js";

import type { KeywordInput } from "../skills/constellationKeywordSync.js";
import type { PaperProfilerInput, PaperProfilerOutput } from "../skills/paperEpistemicProfiler.js";

import type {
    EpistemicProfile,
    ArtifactProfile,
    BilingualText,
    InterpretationSummary,
} from "../schema/framingConstellationBot.js";
import type { StructuredResearchContext } from "../utils/researchContext.js";

// ─── Pipeline output type ────────────────────────────────────

export interface PipelineResult {
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
    interpretation_summary: InterpretationSummary;
}

// ─── Full constellation framing pipeline ─────────────────────

/**
 * Runs the 6-step ConstellationFramingPipeline:
 *   KeywordSync → ArtifactRoleInfluencer → RuleEngine
 *   → FramingGeneratorMVP → AbstractGenerator → TitleGenerator
 */
export async function runPipeline(
    keywords: KeywordInput[],
    structuredContext: StructuredResearchContext,
    researchContext: string,
): Promise<PipelineResult> {
    // Step 1: ConstellationKeywordSync (deterministic)
    const syncResult = constellationKeywordSync(keywords);

    // Step 2: ArtifactRoleInfluencer (deterministic)
    const influencerResult = artifactRoleInfluencer({
        artifact_profile: syncResult.artifact_profile,
        epistemic_profile: syncResult.epistemic_profile,
        keyword_map_by_orientation: syncResult.keyword_map_by_orientation,
        keyword_index: syncResult.keyword_index,
    });

    // Step 3: ConstellationRuleEngine (deterministic)
    const ruleResult = constellationRuleEngine({
        epistemic_profile: syncResult.epistemic_profile,
        keyword_map_by_orientation: syncResult.keyword_map_by_orientation,
        keyword_index: syncResult.keyword_index,
        framing_bias: influencerResult.framing_bias,
    });

    const interpretationSummary = await interpretContext(
        {
            context: structuredContext,
            epistemic_profile: syncResult.epistemic_profile,
            artifact_profile: syncResult.artifact_profile,
            keyword_map_by_orientation: syncResult.keyword_map_by_orientation,
            keyword_index: syncResult.keyword_index,
            reasoning_control: ruleResult.reasoning_control,
        },
        callLLM,
    );

    // Step 4: FramingGeneratorMVP (LLM)
    const framingResult = await framingGeneratorMVP(
        {
            interpreted_context: interpretationSummary,
            raw_context: researchContext,
            rule_engine_output: ruleResult.reasoning_control,
        },
        callLLM,
    );

    // Step 5: ConstellationAbstractGenerator (LLM)
    const abstractResult = await constellationAbstractGenerator(
        {
            background: framingResult.background,
            purpose: framingResult.purpose,
            method: framingResult.method,
            result: framingResult.result,
            contribution: framingResult.contribution,
        },
        callLLM,
    );

    // Step 6: TitleGenerator (LLM)
    const titleResult = await titleGenerator(
        {
            research_question: framingResult.research_question,
            background: framingResult.background,
            purpose: framingResult.purpose,
            method: framingResult.method,
            result: framingResult.result,
            contribution: framingResult.contribution,
            abstract_en: abstractResult.en,
            abstract_zh: abstractResult.zh,
            keyword_map_by_orientation: syncResult.keyword_map_by_orientation,
            epistemic_profile: syncResult.epistemic_profile,
        },
        callLLM,
    );

    const localized = await bilingualFramingLocalizer(
        {
            title: titleResult.title_en,
            research_question: framingResult.research_question,
            background: framingResult.background,
            purpose: framingResult.purpose,
            method: framingResult.method,
            result: framingResult.result,
            contribution: framingResult.contribution,
        },
        callLLM,
    );

    return {
        title: {
            en: titleResult.title_en,
            zh: localized.title,
        },
        research_question: {
            en: framingResult.research_question,
            zh: localized.research_question,
        },
        background: {
            en: framingResult.background,
            zh: localized.background,
        },
        purpose: {
            en: framingResult.purpose,
            zh: localized.purpose,
        },
        method: {
            en: framingResult.method,
            zh: localized.method,
        },
        result: {
            en: framingResult.result,
            zh: localized.result,
        },
        contribution: {
            en: framingResult.contribution,
            zh: localized.contribution,
        },
        abstract: abstractResult,
        epistemic_profile: syncResult.epistemic_profile,
        artifact_profile: syncResult.artifact_profile,
        interpretation_summary: interpretationSummary,
    };
}

// ─── Paper profiler (standalone) ─────────────────────────────

/**
 * Profile a single paper's epistemic orientation + suggest keywords.
 */
export async function runProfilePaper(
    input: PaperProfilerInput,
): Promise<PaperProfilerOutput> {
    return paperEpistemicProfiler(input, callLLM);
}
