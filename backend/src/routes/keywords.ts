// ═══════════════════════════════════════════════════════════════
// Keywords routes (Notion DB2)
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import {
    fetchKeywordsFromDB2,
    writeKeywordsToDB2,
    updateKeywordInDB2,
} from "../services/notionService.js";

const router = Router();

/**
 * GET /api/keywords
 * Fetch all keywords from Notion DB2.
 */
router.get("/", async (_req, res) => {
    try {
        const keywords = await fetchKeywordsFromDB2();
        res.json({ keywords, count: keywords.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/keywords
 * Write suggested keywords to Notion DB2 (active: false by default).
 *
 * Body: { keywords: Array<{ term, orientation, artifact_role, weight?, notes? }> }
 */
router.post("/", async (req, res) => {
    try {
        const { keywords } = req.body;

        if (!Array.isArray(keywords) || keywords.length === 0) {
            res.status(400).json({ error: "keywords array is required" });
            return;
        }

        const pageIds = await writeKeywordsToDB2(keywords);
        res.json({ created: pageIds.length, pageIds });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

/**
 * PATCH /api/keywords/:id
 * Update a keyword in Notion DB2.
 *
 * Body: { active?, weight?, orientation?, artifact_role?, pipeline_role?, notes? }
 */
router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await updateKeywordInDB2(id, updates);
        res.json({ updated: true, id });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

export default router;
