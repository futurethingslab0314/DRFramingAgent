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
    research_context: string;
}

export interface PipelineOutput {
    title: { en: string; zh: string };
    research_question: { en: string; zh: string };
    background: { en: string; zh: string };
    purpose: { en: string; zh: string };
    method: { en: string; zh: string };
    result: { en: string; zh: string };
    contribution: { en: string; zh: string };
    abstract: { en: string; zh: string };
    interpretation_summary: {
        topic_summary: string;
        context_summary: string;
        goal_summary: string;
        method_constraints_summary?: string;
        inferred_research_direction: string;
        inferred_contribution_mode: string;
        possible_risks: string[];
        steering_keywords: string[];
    };
}

// ─── Pipeline runner ─────────────────────────────────────────

/**
 * Runs the full FramingConstellationBot pipeline.
 *
 * @param input        Pipeline inputs (keywords + research_context)
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
            research_context: input.research_context,
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
            abstract_en: abstractResult.en,
            abstract_zh: abstractResult.zh,
            keyword_map_by_orientation: syncResult.keyword_map_by_orientation,
            epistemic_profile: syncResult.epistemic_profile,
        },
        callLLM,
    );

    const localizedResult = {
        title: { en: titleResult.title_en, zh: "" },
        research_question: { en: framingResult.research_question, zh: "" },
        background: { en: framingResult.background, zh: "" },
        purpose: { en: framingResult.purpose, zh: "" },
        method: { en: framingResult.method, zh: "" },
        result: { en: framingResult.result, zh: "" },
        contribution: { en: framingResult.contribution, zh: "" },
        abstract: abstractResult,
        interpretation_summary: {
            topic_summary: "",
            context_summary: "",
            goal_summary: "",
            inferred_research_direction: "",
            inferred_contribution_mode: "",
            possible_risks: [],
            steering_keywords: [],
        },
    };

    // ── Combine & return ──────────────────────────────────────
    return {
        ...localizedResult,
    };
}
