// ═══════════════════════════════════════════════════════════════
// ConstellationFramingPipeline — orchestrator
// ═══════════════════════════════════════════════════════════════

import type { KeywordInput } from "../../.agent/skills/ConstellationKeywordSync/constellationKeywordSync";
import { constellationKeywordSync } from "../../.agent/skills/ConstellationKeywordSync/constellationKeywordSync";
import { artifactRoleInfluencer } from "../../.agent/skills/ArtifactRoleInfluencer/artifactRoleInfluencer";
import { constellationRuleEngine } from "../../.agent/skills/ConstellationRuleEngine/constellationRuleEngine";
import { framingGeneratorMVP } from "../../.agent/skills/FramingGeneratorMVP/framingGeneratorMVP";
import { constellationAbstractGenerator } from "../../.agent/skills/ConstellationAbstractGenerator/constellationAbstractGenerator";
import { titleGenerator } from "../../.agent/skills/TitleGenerator/titleGenerator";

// ─── Pipeline I/O ────────────────────────────────────────────

export interface PipelineInput {
    keywords: KeywordInput[];
    user_context: string;
}

export interface PipelineOutput {
    title: string;
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
    abstract_en: string;
    abstract_zh: string;
}

// ─── Pipeline runner ─────────────────────────────────────────

/**
 * Runs the full FramingConstellationBot pipeline.
 *
 * @param input        Pipeline inputs (keywords + user_context)
 * @param callLLM      Injected LLM caller for the two generative steps
 * @returns            All eight framing output fields
 */
export async function runConstellationFramingPipeline(
    input: PipelineInput,
    callLLM: (system: string, user: string) => Promise<string>,
): Promise<PipelineOutput> {
    // ── Step 1: ConstellationKeywordSync (deterministic) ───────
    const syncResult = constellationKeywordSync(input.keywords);

    // ── Step 2: ArtifactRoleInfluencer (deterministic) ─────────
    const influencerResult = artifactRoleInfluencer({
        artifact_profile: syncResult.artifact_profile,
        epistemic_profile: syncResult.epistemic_profile,
        keyword_map_by_orientation: syncResult.keyword_map_by_orientation,
        keyword_index: syncResult.keyword_index,
    });

    // ── Step 3: ConstellationRuleEngine (deterministic) ────────
    const ruleResult = constellationRuleEngine({
        epistemic_profile: syncResult.epistemic_profile,
        keyword_map_by_orientation: syncResult.keyword_map_by_orientation,
        keyword_index: syncResult.keyword_index,
        framing_bias: influencerResult.framing_bias,
    });

    // ── Step 4: FramingGeneratorMVP (LLM) ─────────────────────
    const framingResult = await framingGeneratorMVP(
        {
            user_context: input.user_context,
            rule_engine_output: ruleResult.reasoning_control,
        },
        callLLM,
    );

    // ── Step 5: ConstellationAbstractGenerator (LLM) ──────────
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

    // ── Step 6: TitleGenerator (LLM) ─────────────────────────
    const titleResult = await titleGenerator(
        {
            research_question: framingResult.research_question,
            background: framingResult.background,
            purpose: framingResult.purpose,
            method: framingResult.method,
            result: framingResult.result,
            contribution: framingResult.contribution,
            abstract_en: abstractResult.abstract_en,
            abstract_zh: abstractResult.abstract_zh,
            keyword_map_by_orientation: syncResult.keyword_map_by_orientation,
            epistemic_profile: syncResult.epistemic_profile,
        },
        callLLM,
    );

    // ── Combine & return ──────────────────────────────────────
    return {
        title: titleResult.title,
        research_question: framingResult.research_question,
        background: framingResult.background,
        purpose: framingResult.purpose,
        method: framingResult.method,
        result: framingResult.result,
        contribution: framingResult.contribution,
        abstract_en: abstractResult.abstract_en,
        abstract_zh: abstractResult.abstract_zh,
    };
}
