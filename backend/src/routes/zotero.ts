// ═══════════════════════════════════════════════════════════════
// Zotero routes
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { fetchAllLibraries } from "../services/zoteroReader.js";
import { runProfilePaper } from "../pipeline/runPipeline.js";
import { writeKeywordsToDB2 } from "../services/notionService.js";

const router = Router();

/**
 * GET /api/zotero/items
 * Fetch papers from all configured Zotero libraries.
 */
router.get("/items", async (_req, res) => {
    try {
        const papers = await fetchAllLibraries();
        res.json({ papers, count: papers.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/zotero/profile
 * Profile a single paper → epistemic estimate + suggested keywords.
 *
 * Body: { title: string, abstract: string, tags?: string[], year?: number }
 */
router.post("/profile", async (req, res) => {
    try {
        const { title, abstract, tags, year } = req.body;

        if (!title || !abstract) {
            res.status(400).json({ error: "title and abstract are required" });
            return;
        }

        const result = await runProfilePaper({ title, abstract, tags, year });
        res.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/zotero/ingest
 * Profile a paper AND write its suggested keywords to Notion DB2 (active: false).
 *
 * Body: { title: string, abstract: string, tags?: string[], year?: number }
 */
router.post("/ingest", async (req, res) => {
    try {
        const { title, abstract, tags, year } = req.body;

        if (!title || !abstract) {
            res.status(400).json({ error: "title and abstract are required" });
            return;
        }

        // Profile the paper
        const profile = await runProfilePaper({ title, abstract, tags, year });

        // Write suggested keywords to DB2
        const keywordsToWrite = profile.suggested_keywords.map((kw) => ({
            ...kw,
            source: "zotero_profile",
        }));
        const pageIds = await writeKeywordsToDB2(keywordsToWrite);

        res.json({
            profiled: true,
            orientation_estimate: profile.orientation_estimate,
            artifact_role_estimate: profile.artifact_role_estimate,
            keywords_created: pageIds.length,
            pageIds,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

export default router;
