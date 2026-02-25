// ═══════════════════════════════════════════════════════════════
// GraphService — multi-layer weighted knowledge graph engine
// ═══════════════════════════════════════════════════════════════

import type {
    Orientation,
    ArtifactRole,
} from "../schema/framingConstellationBot.js";

// ─── Types ───────────────────────────────────────────────────

export type EpistemicEdgeType =
    | "reinforces"      // same orientation
    | "challenges"      // cross-orientation tension
    | "extends"         // builds on (same artifact role)
    | "contextualizes"; // provides framing context

export interface EdgeWeight {
    coOccurrence: number;   // 0–1
    semantic: number;       // 0–1  (placeholder for future LLM embedding)
    rolePrior: number;      // 0–1
    userHistory: number;    // 0–1  (placeholder for future tracking)
    manual: number;         // 0–1  (placeholder for manual edits)
}

export interface GraphEdge {
    source: string;         // keyword id
    target: string;         // keyword id
    weights: EdgeWeight;
    finalWeight: number;
    edgeType: EpistemicEdgeType;
    createdAt: string;
    updatedAt: string;
}

export interface GraphNode {
    id: string;
    term: string;
    orientation: Orientation;
    artifact_role: ArtifactRole;
    weight: number;
    active: boolean;
    frequency: number;        // how many sources reference this term
    sourcePapers: string[];   // paper-scoped source labels
    notes?: string;
}

export interface ConstellationGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// ─── Config ──────────────────────────────────────────────────

export interface WeightConfig {
    coOccurrence: number;
    semantic: number;
    rolePrior: number;
    userHistory: number;
    manual: number;
}

const DEFAULT_WEIGHT_CONFIG: WeightConfig = {
    coOccurrence: 0.4,
    semantic: 0.15,
    rolePrior: 0.15,
    userHistory: 0.2,
    manual: 0.1,
};

const HALF_LIFE_DAYS = 30;
const MAX_EDGES_PER_NODE = 8;
const MIN_FINAL_WEIGHT = 0.05;
const ROLE_PRIOR_BASE = 0.3;

// ─── Input type (from notionService) ─────────────────────────

export interface RawKeyword {
    id: string;
    term: string;
    orientation: Orientation;
    artifact_role: ArtifactRole;
    weight: number;
    active: boolean;
    notes?: string;
    source?: string;
}

// ─── Build graph ─────────────────────────────────────────────

export function buildGraph(
    keywords: RawKeyword[],
    config: WeightConfig = DEFAULT_WEIGHT_CONFIG,
): ConstellationGraph {
    // 1. Build nodes — deduplicate by normalized term, merging metadata
    const termMap = new Map<string, RawKeyword[]>();
    for (const kw of keywords) {
        const key = kw.term.toLowerCase().trim();
        const list = termMap.get(key) ?? [];
        list.push(kw);
        termMap.set(key, list);
    }

    const nodes: GraphNode[] = [];
    // Map from raw keyword id → merged node id
    const idToNodeId = new Map<string, string>();

    for (const [, group] of termMap) {
        // Use first occurrence as the canonical node
        const canonical = group[0];
        const sourcePapers = [
            ...new Set(
                group
                    .map((kw) => kw.source)
                    .filter((s): s is string => !!s),
            ),
        ];

        const node: GraphNode = {
            id: canonical.id,
            term: canonical.term,
            orientation: canonical.orientation,
            artifact_role: canonical.artifact_role,
            weight: Math.max(...group.map((kw) => kw.weight)),
            active: group.some((kw) => kw.active),
            frequency: group.length,
            sourcePapers,
            notes: canonical.notes,
        };
        nodes.push(node);

        for (const kw of group) {
            idToNodeId.set(kw.id, canonical.id);
        }
    }

    // 2. Build source groups for co-occurrence
    const sourceGroups = new Map<string, string[]>(); // source → node ids
    for (const kw of keywords) {
        if (!kw.source) continue;
        const nodeId = idToNodeId.get(kw.id);
        if (!nodeId) continue;
        const list = sourceGroups.get(kw.source) ?? [];
        if (!list.includes(nodeId)) list.push(nodeId);
        sourceGroups.set(kw.source, list);
    }

    // 3. Compute edges
    const edgeMap = new Map<string, GraphEdge>();
    const now = new Date().toISOString();

    // Helper to get or create edge
    function getEdge(a: string, b: string): GraphEdge {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!edgeMap.has(key)) {
            const nodeA = nodes.find((n) => n.id === a)!;
            const nodeB = nodes.find((n) => n.id === b)!;
            edgeMap.set(key, {
                source: a < b ? a : b,
                target: a < b ? b : a,
                weights: {
                    coOccurrence: 0,
                    semantic: 0,
                    rolePrior: 0,
                    userHistory: 0,
                    manual: 0,
                },
                finalWeight: 0,
                edgeType: inferEdgeType(nodeA, nodeB),
                createdAt: now,
                updatedAt: now,
            });
        }
        return edgeMap.get(key)!;
    }

    // 3a. Co-occurrence edges
    for (const [, nodeIds] of sourceGroups) {
        if (nodeIds.length < 2) continue;
        for (let i = 0; i < nodeIds.length; i++) {
            for (let j = i + 1; j < nodeIds.length; j++) {
                const edge = getEdge(nodeIds[i], nodeIds[j]);
                // Increment co-occurrence (capped at 1)
                edge.weights.coOccurrence = Math.min(
                    1,
                    edge.weights.coOccurrence + 1 / sourceGroups.size,
                );
            }
        }
    }

    // 3b. Role prior edges
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            if (a.artifact_role === b.artifact_role) {
                const edge = getEdge(a.id, b.id);
                edge.weights.rolePrior = ROLE_PRIOR_BASE;
            }
        }
    }

    // 4. Compute final weights
    const edges = [...edgeMap.values()];
    for (const edge of edges) {
        edge.finalWeight = computeFinalWeight(edge.weights, config);
    }

    // 5. Apply normalization (prune)
    const prunedEdges = normalizeEdges(edges);

    return { nodes, edges: prunedEdges };
}

// ─── Final weight computation ────────────────────────────────

export function computeFinalWeight(
    weights: EdgeWeight,
    config: WeightConfig = DEFAULT_WEIGHT_CONFIG,
): number {
    const totalCoeff =
        config.coOccurrence +
        config.semantic +
        config.rolePrior +
        config.userHistory +
        config.manual;

    if (totalCoeff === 0) return 0;

    const weighted =
        weights.coOccurrence * config.coOccurrence +
        weights.semantic * config.semantic +
        weights.rolePrior * config.rolePrior +
        weights.userHistory * config.userHistory +
        weights.manual * config.manual;

    return weighted / totalCoeff;
}

// ─── Time decay ──────────────────────────────────────────────

export function applyTimeDecay(
    edges: GraphEdge[],
    halfLifeDays: number = HALF_LIFE_DAYS,
): GraphEdge[] {
    const now = Date.now();

    return edges.map((edge) => {
        const updatedMs = new Date(edge.updatedAt).getTime();
        const daysSince = (now - updatedMs) / (1000 * 60 * 60 * 24);
        const decayFactor = Math.pow(0.5, daysSince / halfLifeDays);

        return {
            ...edge,
            finalWeight: edge.finalWeight * decayFactor,
        };
    });
}

// ─── Normalize: cap edges per node, prune weak ones ──────────

export function normalizeEdges(
    edges: GraphEdge[],
    maxPerNode: number = MAX_EDGES_PER_NODE,
    minWeight: number = MIN_FINAL_WEIGHT,
): GraphEdge[] {
    // Remove below threshold
    let filtered = edges.filter((e) => e.finalWeight >= minWeight);

    // Sort by finalWeight descending
    filtered.sort((a, b) => b.finalWeight - a.finalWeight);

    // Cap per node
    const nodeCounts = new Map<string, number>();
    const result: GraphEdge[] = [];

    for (const edge of filtered) {
        const srcCount = nodeCounts.get(edge.source) ?? 0;
        const tgtCount = nodeCounts.get(edge.target) ?? 0;

        if (srcCount < maxPerNode && tgtCount < maxPerNode) {
            result.push(edge);
            nodeCounts.set(edge.source, srcCount + 1);
            nodeCounts.set(edge.target, tgtCount + 1);
        }
    }

    return result;
}

// ─── Infer epistemic edge type ───────────────────────────────

function inferEdgeType(
    a: { orientation: Orientation; artifact_role: ArtifactRole },
    b: { orientation: Orientation; artifact_role: ArtifactRole },
): EpistemicEdgeType {
    if (a.orientation === b.orientation && a.artifact_role === b.artifact_role) {
        return "reinforces";
    }
    if (a.orientation === b.orientation) {
        return "extends";
    }
    if (a.artifact_role === b.artifact_role) {
        return "contextualizes";
    }
    return "challenges";
}

// ─── Top-K neighbors ─────────────────────────────────────────

export function getTopKNeighbors(
    nodeId: string,
    edges: GraphEdge[],
    k: number = 5,
): Array<{ neighborId: string; weight: number; edgeType: EpistemicEdgeType }> {
    const neighbors = edges
        .filter((e) => e.source === nodeId || e.target === nodeId)
        .map((e) => ({
            neighborId: e.source === nodeId ? e.target : e.source,
            weight: e.finalWeight,
            edgeType: e.edgeType,
        }))
        .sort((a, b) => b.weight - a.weight);

    return neighbors.slice(0, k);
}
