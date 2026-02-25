// ═══════════════════════════════════════════════════════════════
// Zotero routes
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { fetchAllLibraries } from "../services/zoteroReader.js";
import { runProfilePaper } from "../pipeline/runPipeline.js";
import { writeKeywordsToDB2 } from "../services/notionService.js";
import { keywordConceptRefiner } from "../skills/keywordConceptRefiner.js";

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
 * Profile a paper, refine/merge keywords, then write to Notion DB2 (active: false).
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

        // Refine before ingest (conceptual-first)
        const refinement = keywordConceptRefiner(
            profile.suggested_keywords.map((kw) => ({
                ...kw,
                active: true,
            })),
            {
                mode: "conceptual_strict",
                max_keywords: 12,
                min_weight: 0.35,
                drop_terms: ["system", "platform", "technology", "model", "framework"],
            },
        );

        // Write suggested keywords to DB2
        const paperSource = `zotero:${title}`;
        const keywordsToWrite = refinement.refined_keywords.map((kw) => ({
            ...kw,
            source: paperSource,
        }));
        const pageIds = await writeKeywordsToDB2(keywordsToWrite);

        res.json({
            profiled: true,
            orientation_estimate: profile.orientation_estimate,
            artifact_role_estimate: profile.artifact_role_estimate,
            keywords_raw: profile.suggested_keywords.length,
            keywords_refined: refinement.refined_keywords.length,
            keywords_dropped: refinement.dropped_keywords.length,
            keywords_created: pageIds.length,
            refinement_report: {
                dropped: refinement.dropped_keywords,
                merged: refinement.merge_report,
            },
            pageIds,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

export default router;
