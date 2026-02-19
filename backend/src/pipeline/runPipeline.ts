// ═══════════════════════════════════════════════════════════════
// Pipeline runner — wires skills with backend services
// ═══════════════════════════════════════════════════════════════

import { callLLM } from "../services/llmService.js";

import { constellationKeywordSync } from "../skills/constellationKeywordSync.js";
import { artifactRoleInfluencer } from "../skills/artifactRoleInfluencer.js";
import { constellationRuleEngine } from "../skills/constellationRuleEngine.js";
import { framingGeneratorMVP } from "../skills/framingGeneratorMVP.js";
import { constellationAbstractGenerator } from "../skills/constellationAbstractGenerator.js";
import { paperEpistemicProfiler } from "../skills/paperEpistemicProfiler.js";

import type { KeywordInput } from "../skills/constellationKeywordSync.js";
import type { PaperProfilerInput, PaperProfilerOutput } from "../skills/paperEpistemicProfiler.js";

import type {
    EpistemicProfile,
    ArtifactProfile,
} from "../schema/framingConstellationBot.js";

// ─── Pipeline output type ────────────────────────────────────

export interface PipelineResult {
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
    abstract_en: string;
    abstract_zh: string;
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;
}

// ─── Full constellation framing pipeline ─────────────────────

/**
 * Runs the 5-step ConstellationFramingPipeline:
 *   KeywordSync → ArtifactRoleInfluencer → RuleEngine
 *   → FramingGeneratorMVP → AbstractGenerator
 */
export async function runPipeline(
    keywords: KeywordInput[],
    userContext: string,
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

    // Step 4: FramingGeneratorMVP (LLM)
    const framingResult = await framingGeneratorMVP(
        {
            user_context: userContext,
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

    return {
        ...framingResult,
        abstract_en: abstractResult.abstract_en,
        abstract_zh: abstractResult.abstract_zh,
        epistemic_profile: syncResult.epistemic_profile,
        artifact_profile: syncResult.artifact_profile,
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
