// ═══════════════════════════════════════════════════════════════
// API client — keywords (Notion DB2)
// ═══════════════════════════════════════════════════════════════

import type { Keyword } from "../types/keyword";

const BASE = "/api/keywords";

export async function fetchKeywords(): Promise<{
    keywords: Keyword[];
    count: number;
}> {
    const res = await fetch(BASE);
    if (!res.ok) throw new Error(`fetchKeywords failed: ${res.status}`);
    return res.json();
}

export async function createKeywords(
    keywords: Array<{
        term: string;
        orientation: string;
        artifact_role: string;
        weight?: number;
        notes?: string;
        source?: string;
    }>,
): Promise<{ created: number; pageIds: string[] }> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
    });
    if (!res.ok) throw new Error(`createKeywords failed: ${res.status}`);
    return res.json();
}

export async function patchKeyword(
    id: string,
    updates: Partial<{
        active: boolean;
        weight: number;
        orientation: string;
        artifact_role: string;
        pipeline_role: string;
        notes: string;
    }>,
): Promise<{ updated: boolean; id: string }> {
    const res = await fetch(`${BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`patchKeyword failed: ${res.status}`);
    return res.json();
}
