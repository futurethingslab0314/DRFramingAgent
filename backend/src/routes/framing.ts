import { Router } from "express";
import { runPipeline } from "../pipeline/runPipeline.js";
import {
    fetchKeywordsFromDB2,
    writeFramingToDB1,
} from "../services/notionService.js";
import { callLLM } from "../services/llmService.js";
import { constellationAbstractGenerator } from "../skills/constellationAbstractGenerator.js";
import { titleGenerator } from "../skills/titleGenerator.js";
import { bilingualFramingLocalizer } from "../skills/bilingualFramingLocalizer.js";
import {
    generateFramingDirections,
    generateGuidedExpansion,
} from "../skills/guidedExpansionGenerator.js";
import {
    composeResearchContext,
    parseIdeaSeedRequest,
    parseStructuredResearchContext,
} from "../utils/researchContext.js";
import type { FramingResult } from "../services/notionService.js";

function buildTitleContext(activeKeywords: Awaited<ReturnType<typeof fetchKeywordsFromDB2>>) {
    const keyword_map_by_orientation = {
        exploratory: activeKeywords
            .filter((kw) => kw.orientation === "exploratory")
            .map((kw) => kw.term),
        critical: activeKeywords
            .filter((kw) => kw.orientation === "critical")
            .map((kw) => kw.term),
        problem_solving: activeKeywords
            .filter((kw) => kw.orientation === "problem_solving")
            .map((kw) => kw.term),
        constructive: activeKeywords
            .filter((kw) => kw.orientation === "constructive")
            .map((kw) => kw.term),
    };

    const total = activeKeywords.reduce((sum, kw) => sum + kw.weight, 0) || 1;
    const epistemic_profile = {
        exploratory:
            activeKeywords
                .filter((kw) => kw.orientation === "exploratory")
                .reduce((sum, kw) => sum + kw.weight, 0) / total,
        critical:
            activeKeywords
                .filter((kw) => kw.orientation === "critical")
                .reduce((sum, kw) => sum + kw.weight, 0) / total,
        problem_solving:
            activeKeywords
                .filter((kw) => kw.orientation === "problem_solving")
                .reduce((sum, kw) => sum + kw.weight, 0) / total,
        constructive:
            activeKeywords
                .filter((kw) => kw.orientation === "constructive")
                .reduce((sum, kw) => sum + kw.weight, 0) / total,
    };

    return { keyword_map_by_orientation, epistemic_profile };
}

const router = Router();

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
 * Refine user-edited framing fields using LLM for academic polish and logical coherence.
 *
 * Body: bilingual FramingRunResponse payload without profiles changes
 */
router.post("/refine", async (req, res) => {
    try {
        const {
            research_question,
            background,
            purpose,
            method,
            result,
            contribution,
            epistemic_profile,
            artifact_profile,
            interpretation_summary,
        } = req.body;

        if (!research_question?.en) {
            res.status(400).json({ error: "bilingual research_question is required" });
            return;
        }

        const system = `You are an expert academic writing consultant specializing in design research.
Your task is to refine and improve the user's research framing while preserving their original intent and key ideas.

Guidelines:
1. Maintain academic tone and rigor
2. Ensure logical coherence across all fields (background → purpose → method → result → contribution)
3. Tighten prose — remove redundancy, improve clarity
4. Ensure the research question aligns with the purpose and method
5. Preserve the user's core arguments and terminology
6. Do NOT change the fundamental research direction

Return a JSON object with exactly these fields:
{ "research_question", "background", "purpose", "method", "result", "contribution" }`;

        const user = JSON.stringify({
            research_question: research_question.en,
            background: background.en,
            purpose: purpose.en,
            method: method.en,
            result: result.en,
            contribution: contribution.en,
        });

        const raw = await callLLM(system, `Please refine the following research framing:\n${user}`);
        const refined = JSON.parse(raw) as Record<string, unknown>;

        const refinedEnglish = {
            research_question: String(refined.research_question ?? "").trim(),
            background: String(refined.background ?? "").trim(),
            purpose: String(refined.purpose ?? "").trim(),
            method: String(refined.method ?? "").trim(),
            result: String(refined.result ?? "").trim(),
            contribution: String(refined.contribution ?? "").trim(),
        };

        const missing = Object.entries(refinedEnglish).find(([, value]) => !value);
        if (missing) {
            throw new Error(`Missing or empty field: "${missing[0]}"`);
        }

        const [allKeywords, abstract] = await Promise.all([
            fetchKeywordsFromDB2(),
            constellationAbstractGenerator(refinedEnglish, callLLM),
        ]);
        const activeKeywords = allKeywords.filter((kw) => kw.active);
        const titleContext = buildTitleContext(activeKeywords);
        const englishTitle = await titleGenerator(
            {
                ...refinedEnglish,
                abstract_en: abstract.en,
                abstract_zh: abstract.zh,
                ...titleContext,
            },
            callLLM,
        );

        const localized = await bilingualFramingLocalizer(
            {
                title: englishTitle.title_en,
                ...refinedEnglish,
            },
            callLLM,
        );

        res.json({
            title: {
                en: englishTitle.title_en,
                zh: localized.title,
            },
            research_question: {
                en: refinedEnglish.research_question,
                zh: localized.research_question,
            },
            background: {
                en: refinedEnglish.background,
                zh: localized.background,
            },
            purpose: {
                en: refinedEnglish.purpose,
                zh: localized.purpose,
            },
            method: {
                en: refinedEnglish.method,
                zh: localized.method,
            },
            result: {
                en: refinedEnglish.result,
                zh: localized.result,
            },
            contribution: {
                en: refinedEnglish.contribution,
                zh: localized.contribution,
            },
            abstract,
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
