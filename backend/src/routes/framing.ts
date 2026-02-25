import { Router } from "express";
import { runPipeline } from "../pipeline/runPipeline.js";
import {
    fetchKeywordsFromDB2,
    writeFramingToDB1,
} from "../services/notionService.js";
import { callLLM } from "../services/llmService.js";

const router = Router();

/**
 * POST /api/framing/run
 * Run the full ConstellationFramingPipeline.
 * Auto-fetches active keywords from DB2, runs the 6-step pipeline.
 *
 * Body: { user_context: string, owner?: string }
 */
router.post("/run", async (req, res) => {
    try {
        const { user_context } = req.body;

        if (!user_context || typeof user_context !== "string") {
            res.status(400).json({ error: "user_context string is required" });
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
        const result = await runPipeline(activeKeywords, user_context);

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
 * Body: { framing: FramingRunResponse, title?: string }
 */
router.post("/save", async (req, res) => {
    try {
        const { framing, title } = req.body;

        if (!framing || !framing.research_question) {
            res.status(400).json({ error: "framing object with research_question is required" });
            return;
        }

        const notionPageId = await writeFramingToDB1(framing, title);

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
 * Body: { research_question, background, purpose, method, result, contribution, abstract_en, abstract_zh }
 */
router.post("/refine", async (req, res) => {
    try {
        const { research_question, background, purpose, method, result, contribution, abstract_en, abstract_zh } = req.body;

        if (!research_question) {
            res.status(400).json({ error: "research_question is required" });
            return;
        }

        const system = `You are an expert academic writing consultant specializing in design research.
Your task is to refine and improve the user's research framing while preserving their original intent and key ideas.

Guidelines:
1. Maintain academic tone and rigor
2. Ensure logical coherence across all fields (background → purpose → method → result → contribution)
3. Tighten prose — remove redundancy, improve clarity
4. Ensure the research question aligns with the purpose and method
5. Make abstracts concise yet comprehensive
6. Preserve the user's core arguments and terminology
7. Do NOT change the fundamental research direction

Return a JSON object with exactly these fields:
{ "research_question", "background", "purpose", "method", "result", "contribution", "abstract_en", "abstract_zh" }`;

        const user = JSON.stringify({
            research_question,
            background,
            purpose,
            method,
            result,
            contribution,
            abstract_en,
            abstract_zh,
        });

        const raw = await callLLM(system, `Please refine the following research framing:\n${user}`);
        const refined = JSON.parse(raw);

        res.json(refined);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

export default router;
