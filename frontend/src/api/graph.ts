// ═══════════════════════════════════════════════════════════════
// API client — constellation graph
// ═══════════════════════════════════════════════════════════════

import type { ConstellationGraph, TopKNeighborResult } from "../types/keyword";

export async function fetchGraph(): Promise<ConstellationGraph> {
    const res = await fetch("/api/graph");
    if (!res.ok) throw new Error(`fetchGraph failed: ${res.status}`);
    return res.json();
}

export async function fetchTopKNeighbors(
    nodeId: string,
    k: number = 5,
): Promise<TopKNeighborResult> {
    const res = await fetch(`/api/graph/neighbors/${nodeId}?k=${k}`);
    if (!res.ok) throw new Error(`fetchTopKNeighbors failed: ${res.status}`);
    return res.json();
}
