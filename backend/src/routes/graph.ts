// ═══════════════════════════════════════════════════════════════
// Graph routes — constellation knowledge graph API
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { fetchKeywordsFromDB2 } from "../services/notionService.js";
import {
    buildGraph,
    getTopKNeighbors,
    applyTimeDecay,
    type RawKeyword,
} from "../services/graphService.js";

const router = Router();

/**
 * GET /api/graph
 * Build and return the full constellation graph (nodes + edges).
 */
router.get("/", async (_req, res) => {
    try {
        const keywords = await fetchKeywordsFromDB2();

        // Cast to RawKeyword (NotionKeyword is a superset)
        const raw: RawKeyword[] = keywords.map((kw) => ({
            id: kw.id,
            term: kw.term,
            orientation: kw.orientation,
            artifact_role: kw.artifact_role,
            weight: kw.weight,
            active: kw.active,
            notes: kw.notes,
            source: kw.source,
        }));

        const graph = buildGraph(raw);

        // Apply time decay
        graph.edges = applyTimeDecay(graph.edges);

        res.json(graph);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

/**
 * GET /api/graph/neighbors/:id?k=5
 * Return top-k influential neighbors for a given node.
 */
router.get("/neighbors/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const k = parseInt(req.query.k as string) || 5;

        const keywords = await fetchKeywordsFromDB2();
        const raw: RawKeyword[] = keywords.map((kw) => ({
            id: kw.id,
            term: kw.term,
            orientation: kw.orientation,
            artifact_role: kw.artifact_role,
            weight: kw.weight,
            active: kw.active,
            notes: kw.notes,
            source: kw.source,
        }));

        const graph = buildGraph(raw);
        graph.edges = applyTimeDecay(graph.edges);

        const neighbors = getTopKNeighbors(id, graph.edges, k);
        res.json({ nodeId: id, neighbors });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});

export default router;
