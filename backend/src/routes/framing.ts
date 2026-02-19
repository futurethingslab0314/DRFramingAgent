// ═══════════════════════════════════════════════════════════════
// Framing routes (replaces old pipeline routes)
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { runPipeline } from "../pipeline/runPipeline.js";
import {
    fetchKeywordsFromDB2,
    writeFramingToDB1,
} from "../services/notionService.js";

const router = Router();

/**
 * POST /api/framing/run
 * Run the full ConstellationFramingPipeline.
 * Auto-fetches active keywords from DB2, runs the 5-step pipeline.
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

export default router;
