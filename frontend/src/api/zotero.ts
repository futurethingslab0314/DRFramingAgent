// ═══════════════════════════════════════════════════════════════
// API client — Zotero paper ingest
// ═══════════════════════════════════════════════════════════════

export interface ZoteroPaper {
    key: string;
    title: string;
    abstract: string;
    tags: string[];
    year?: number;
    doi?: string;
}

export interface IngestResult {
    profiled: boolean;
    orientation_estimate: Record<string, number>;
    artifact_role_estimate: Record<string, number>;
    keywords_raw: number;
    keywords_refined: number;
    keywords_dropped: number;
    keywords_created: number;
    refinement_report: {
        dropped: Array<{ term: string; reason: string }>;
        merged: Array<{ canonical_term: string; merged_from: string[] }>;
    };
    pageIds: string[];
}

export async function fetchZoteroPapers(): Promise<{
    papers: ZoteroPaper[];
    count: number;
}> {
    const res = await fetch("/api/zotero/items");
    if (!res.ok) throw new Error(`fetchZoteroPapers failed: ${res.status}`);
    return res.json();
}

export async function ingestPaper(paper: {
    title: string;
    abstract: string;
    tags?: string[];
    year?: number;
}): Promise<IngestResult> {
    const res = await fetch("/api/zotero/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paper),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
            (body as { error?: string }).error ?? `ingestPaper failed: ${res.status}`,
        );
    }
    return res.json();
}
