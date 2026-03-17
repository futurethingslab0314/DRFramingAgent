import { Router } from "express";
import { runPipeline } from "../pipeline/runPipeline.js";
import {
    fetchKeywordsFromDB2,
    writeFramingToDB1,
} from "../services/notionService.js";
import { callLLM } from "../services/llmService.js";
import {
    generateFramingDirections,
    generateGuidedExpansion,
} from "../skills/guidedExpansionGenerator.js";
import {
    composeResearchContext,
    parseIdeaSeedRequest,
    parseStructuredResearchContext,
} from "../utils/researchContext.js";
import {
    enforceAuthoritativeFieldPreservation,
    extractAuthoritativeFieldChanges,
    parseRefinedFramingSyncResponse,
    REFINE_SYNC_FIELDS,
    type RefineSyncLanguage,
    type RefineSyncPayload,
} from "../utils/framingRefineSync.js";
import type { FramingResult } from "../services/notionService.js";
import type {
    ArtifactProfile,
    EpistemicProfile,
    InterpretationSummary,
} from "../schema/framingConstellationBot.js";

const router = Router();

type RefineRoutePayload = FramingResult & Partial<{
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;
    interpretation_summary: InterpretationSummary;
}>;

function toRefineSyncPayload(source: Partial<RefineRoutePayload>): RefineSyncPayload {
    return Object.fromEntries(
        REFINE_SYNC_FIELDS.map((field) => [
            field,
            {
                en: String(source[field]?.en ?? "").trim(),
                zh: String(source[field]?.zh ?? "").trim(),
            },
        ]),
    ) as RefineSyncPayload;
}

router.post("/expand", async (req, res) => {
    try {
        const ideaSeed = parseIdeaSeedRequest(req.body);
        const allKeywords = await fetchKeywordsFromDB2();
        const activeKeywords = allKeywords.filter((kw) => kw.active);

        if (activeKeywords.length === 0) {
            res.status(400).json({ error: "No active keywords in DB2. Add or activate keywords first." });
            return;
        }

        const expansion = generateGuidedExpansion(activeKeywords, ideaSeed);

        res.json({
            idea_seed: ideaSeed,
            ...expansion,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(400).json({ error: message });
    }
});

router.post("/directions", async (req, res) => {
    try {
        const ideaSeed = parseIdeaSeedRequest(req.body);
        const allKeywords = await fetchKeywordsFromDB2();
        const activeKeywords = allKeywords.filter((kw) => kw.active);

        if (activeKeywords.length === 0) {
            res.status(400).json({ error: "No active keywords in DB2. Add or activate keywords first." });
            return;
        }

        const expansion = generateGuidedExpansion(activeKeywords, ideaSeed);
        const directions = generateFramingDirections({
            ideaSeed,
            expansion,
            selectedLenses: req.body.selected_lenses,
            selectedContexts: req.body.selected_contexts,
            selectedTensions: req.body.selected_tensions,
            steeringNote: typeof req.body.steering_note === "string"
                ? req.body.steering_note
                : undefined,
        });

        res.json({ directions });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(400).json({ error: message });
    }
});

/**
 * POST /api/framing/run
 * Run the full ConstellationFramingPipeline.
 * Auto-fetches active keywords from DB2, runs the 6-step pipeline.
 *
 * Body:
 *   New: { context: { research_topic, target_context, research_goal, method_or_constraints? }, owner?: string }
 *   Legacy: { user_context: string, owner?: string }
 */
router.post("/run", async (req, res) => {
    try {
        let userContext: string;
        let parsedContext;
        try {
            parsedContext = parseStructuredResearchContext(req.body);
            userContext = composeResearchContext(parsedContext);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Invalid research context";
            res.status(400).json({ error: message });
            return;
        }

        // Fetch active keywords from Notion DB2
        const allKeywords = await fetchKeywordsFromDB2();
        const activeKeywords = allKeywords.filter((kw) => kw.active);

        if (activeKeywords.length === 0) {
            res.status(400).json({ error: "No active keywords in DB2. Add or activate keywords first." });
            return;
        }

        // Run the 5-step pipeline
        const result = await runPipeline(activeKeywords, parsedContext, userContext);

        res.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/framing/save
 * Save a FramingRunResponse to Notion DB1.
 *
 * Body: { framing: FramingRunResponse, title?: string, owner?: string }
 */
router.post("/save", async (req, res) => {
    try {
        const { framing, title, owner } = req.body;

        if (!framing || !framing.research_question?.en) {
            res.status(400).json({ error: "framing object with bilingual research_question is required" });
            return;
        }

        const notionPageId = await writeFramingToDB1(
            framing as FramingResult,
            title ?? framing.title?.en,
            owner,
        );

        res.json({
            saved: true,
            notion_page_id: notionPageId,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/framing/refine
 * Refine user-edited framing fields using baseline-aware bilingual sync.
 *
 * Body: { framing, baseline, authoritative_language }
 */
router.post("/refine", async (req, res) => {
    try {
        const framing = (req.body?.framing ?? req.body) as Partial<RefineRoutePayload>;
        const baseline = (req.body?.baseline ?? framing) as Partial<RefineRoutePayload>;
        const authoritativeLanguage: RefineSyncLanguage =
            req.body?.authoritative_language === "zh" ? "zh" : "en";
        const secondaryLanguage: RefineSyncLanguage =
            authoritativeLanguage === "en" ? "zh" : "en";
        const {
            research_question,
            epistemic_profile,
            artifact_profile,
            interpretation_summary,
        } = framing;

        if (!research_question?.en || !research_question?.zh) {
            res.status(400).json({ error: "bilingual research_question is required" });
            return;
        }

        const currentPayload = toRefineSyncPayload(framing);
        const baselinePayload = toRefineSyncPayload(baseline);
        const authoritativeChangedFields = extractAuthoritativeFieldChanges(
            currentPayload,
            baselinePayload,
            authoritativeLanguage,
        );

        const system = `You are an expert bilingual academic writing consultant specializing in design research.
Your task is to refine a bilingual framing package while preserving the user's edits in the authoritative language.

Rules:
1. The authoritative language is the source of truth.
2. For authoritative fields listed in authoritative_changed_fields, treat the current authoritative-language text as a protected author revision.
3. Protected authoritative fields may receive only surface-level polish for clarity, grammar, and flow. Do not replace their concepts, scope, examples, or emphasis with baseline ideas.
4. If a protected authoritative field conflicts with other fields, revise the other fields to align with it. Never revert the protected field back toward the baseline framing.
5. Synchronize the secondary language to match the authoritative language faithfully and naturally.
6. Keep the full package logically coherent across title, research_question, background, purpose, method, result, contribution, and abstract.
7. Maintain academic tone and design-research specificity.
8. Do not introduce a new research direction or remove key claims unless the current text is internally inconsistent.
9. Return ONLY valid JSON.

Return exactly this shape:
{
  "title": { "en": string, "zh": string },
  "research_question": { "en": string, "zh": string },
  "background": { "en": string, "zh": string },
  "purpose": { "en": string, "zh": string },
  "method": { "en": string, "zh": string },
  "result": { "en": string, "zh": string },
  "contribution": { "en": string, "zh": string },
  "abstract": { "en": string, "zh": string }
}`;

        const user = JSON.stringify({
            authoritative_language: authoritativeLanguage,
            secondary_language: secondaryLanguage,
            authoritative_changed_fields: authoritativeChangedFields,
            protected_authoritative_text: Object.fromEntries(
                authoritativeChangedFields.map((field) => [
                    field,
                    currentPayload[field][authoritativeLanguage],
                ]),
            ),
            current: currentPayload,
            baseline: baselinePayload,
            notes: authoritativeChangedFields.length > 0
                ? "Treat the changed authoritative-language fields as non-negotiable intent. Keep their concepts intact, and update the rest of the package around them."
                : "No authoritative-language fields changed from the baseline. Lightly polish the current framing and keep both languages aligned.",
        });

        const raw = await callLLM(
            system,
            `Please refine and synchronize the following framing package:\n${user}`,
        );
        const refined = enforceAuthoritativeFieldPreservation({
            current: currentPayload,
            refined: parseRefinedFramingSyncResponse(raw),
            authoritativeLanguage,
            authoritativeChangedFields,
        });

        res.json({
            title: refined.title,
            research_question: refined.research_question,
            background: refined.background,
            purpose: refined.purpose,
            method: refined.method,
            result: refined.result,
            contribution: refined.contribution,
            abstract: refined.abstract,
            epistemic_profile,
            artifact_profile,
            interpretation_summary,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

export default router;
