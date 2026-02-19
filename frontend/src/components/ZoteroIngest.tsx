// ═══════════════════════════════════════════════════════════════
// ZoteroIngest — fetch Zotero papers, analyze & ingest keywords
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { theme } from "../design/theme";
import {
    fetchZoteroPapers,
    ingestPaper,
    type ZoteroPaper,
    type IngestResult,
} from "../api/zotero";

type PaperStatus = "idle" | "processing" | "done" | "error";

interface PaperEntry {
    paper: ZoteroPaper;
    status: PaperStatus;
    result?: IngestResult;
    error?: string;
}

interface ZoteroIngestProps {
    onKeywordsAdded: () => void;
}

export default function ZoteroIngest({ onKeywordsAdded }: ZoteroIngestProps) {
    const [papers, setPapers] = useState<PaperEntry[]>([]);
    const [fetching, setFetching] = useState(false);
    const [batchRunning, setBatchRunning] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // ── Fetch all papers from Zotero ─────────────────────────
    const handleFetch = useCallback(async () => {
        setFetching(true);
        setFetchError(null);
        try {
            const res = await fetchZoteroPapers();
            setPapers(
                res.papers.map((p) => ({ paper: p, status: "idle" as PaperStatus })),
            );
        } catch (err) {
            setFetchError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setFetching(false);
        }
    }, []);

    // ── Ingest a single paper ────────────────────────────────
    const handleIngestOne = useCallback(
        async (index: number) => {
            setPapers((prev) =>
                prev.map((e, i) =>
                    i === index ? { ...e, status: "processing" } : e,
                ),
            );

            try {
                const entry = papers[index];
                const result = await ingestPaper({
                    title: entry.paper.title,
                    abstract: entry.paper.abstract,
                    tags: entry.paper.tags,
                    year: entry.paper.year,
                });

                setPapers((prev) =>
                    prev.map((e, i) =>
                        i === index ? { ...e, status: "done", result } : e,
                    ),
                );
                onKeywordsAdded();
            } catch (err) {
                setPapers((prev) =>
                    prev.map((e, i) =>
                        i === index
                            ? {
                                ...e,
                                status: "error",
                                error:
                                    err instanceof Error
                                        ? err.message
                                        : "Unknown error",
                            }
                            : e,
                    ),
                );
            }
        },
        [papers, onKeywordsAdded],
    );

    // ── Ingest all papers with abstracts ─────────────────────
    const handleIngestAll = useCallback(async () => {
        setBatchRunning(true);
        const eligibleIndices = papers
            .map((e, i) => ({ e, i }))
            .filter(
                ({ e }) =>
                    e.paper.abstract.trim().length > 0 && e.status === "idle",
            )
            .map(({ i }) => i);

        for (const idx of eligibleIndices) {
            setPapers((prev) =>
                prev.map((e, i) =>
                    i === idx ? { ...e, status: "processing" } : e,
                ),
            );

            try {
                const entry = papers[idx];
                const result = await ingestPaper({
                    title: entry.paper.title,
                    abstract: entry.paper.abstract,
                    tags: entry.paper.tags,
                    year: entry.paper.year,
                });
                setPapers((prev) =>
                    prev.map((e, i) =>
                        i === idx ? { ...e, status: "done", result } : e,
                    ),
                );
            } catch (err) {
                setPapers((prev) =>
                    prev.map((e, i) =>
                        i === idx
                            ? {
                                ...e,
                                status: "error",
                                error:
                                    err instanceof Error
                                        ? err.message
                                        : "Unknown error",
                            }
                            : e,
                    ),
                );
            }
        }

        onKeywordsAdded();
        setBatchRunning(false);
    }, [papers, onKeywordsAdded]);

    // ── Status badge ─────────────────────────────────────────
    const statusBadge = (status: PaperStatus) => {
        const map: Record<PaperStatus, { label: string; color: string }> = {
            idle: { label: "Ready", color: "text-slate-400" },
            processing: { label: "Analyzing…", color: "text-amber-400" },
            done: { label: "✓ Done", color: "text-emerald-400" },
            error: { label: "✗ Error", color: "text-red-400" },
        };
        const { label, color } = map[status];
        return <span className={`text-xs font-mono ${color}`}>{label}</span>;
    };

    // ── Stats ────────────────────────────────────────────────
    const withAbstract = papers.filter((e) => e.paper.abstract.trim().length > 0);
    const doneCount = papers.filter((e) => e.status === "done").length;
    const idleWithAbstract = papers.filter(
        (e) => e.paper.abstract.trim().length > 0 && e.status === "idle",
    ).length;

    return (
        <div
            className={`rounded-xl border ${theme.layout.glassBorder} ${theme.layout.panelBg} ${theme.layout.glassEffect} p-4`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3
                    className={theme.typography.subheading}
                    style={{ fontSize: 13 }}
                >
                    📚 Zotero Ingest
                </h3>
                <button
                    onClick={handleFetch}
                    disabled={fetching}
                    className={theme.components.buttonGhost}
                    style={{ fontSize: 12 }}
                >
                    {fetching ? "Fetching…" : "Fetch Papers"}
                </button>
            </div>

            {fetchError && (
                <p className="text-xs text-red-400 mb-2">{fetchError}</p>
            )}

            {/* Paper list */}
            {papers.length > 0 && (
                <>
                    {/* Stats bar */}
                    <div className="flex items-center justify-between mb-3">
                        <span
                            className="text-xs"
                            style={{ color: theme.colors.text.dim }}
                        >
                            {papers.length} papers • {withAbstract.length} with
                            abstract • {doneCount} ingested
                        </span>
                        {idleWithAbstract > 0 && (
                            <button
                                onClick={handleIngestAll}
                                disabled={batchRunning}
                                className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${batchRunning
                                    ? "bg-slate-700 text-slate-500 cursor-wait"
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                                    }`}
                            >
                                {batchRunning
                                    ? "Processing…"
                                    : `Ingest All (${idleWithAbstract})`}
                            </button>
                        )}
                    </div>

                    {/* Scrollable paper list */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {papers.map((entry, idx) => {
                            const hasAbstract =
                                entry.paper.abstract.trim().length > 0;
                            return (
                                <div
                                    key={entry.paper.key}
                                    className={`rounded-lg border ${theme.layout.glassBorder} p-3 transition-all ${entry.status === "done"
                                        ? "border-emerald-800/50 bg-emerald-950/20"
                                        : entry.status === "error"
                                            ? "border-red-800/50 bg-red-950/20"
                                            : "bg-slate-900/40"
                                        }`}
                                >
                                    {/* Title + status */}
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p
                                            className="text-sm font-medium leading-snug flex-1"
                                            style={{
                                                color: theme.colors.text.bright,
                                            }}
                                        >
                                            {entry.paper.title}
                                        </p>
                                        {statusBadge(entry.status)}
                                    </div>

                                    {/* Abstract preview */}
                                    {hasAbstract && (
                                        <p
                                            className="text-xs leading-relaxed line-clamp-2 mb-2"
                                            style={{
                                                color: theme.colors.text.dim,
                                            }}
                                        >
                                            {entry.paper.abstract}
                                        </p>
                                    )}

                                    {/* Tags + year */}
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        {entry.paper.year && (
                                            <span className="text-xs font-mono text-slate-500">
                                                {entry.paper.year}
                                            </span>
                                        )}
                                        {entry.paper.tags
                                            .slice(0, 3)
                                            .map((t) => (
                                                <span
                                                    key={t}
                                                    className="text-xs px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        {entry.paper.tags.length > 3 && (
                                            <span className="text-xs text-slate-500">
                                                +{entry.paper.tags.length - 3}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action / result */}
                                    {entry.status === "idle" && hasAbstract && (
                                        <button
                                            onClick={() =>
                                                handleIngestOne(idx)
                                            }
                                            className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors"
                                        >
                                            Analyze & Ingest
                                        </button>
                                    )}
                                    {entry.status === "idle" && !hasAbstract && (
                                        <span className="text-xs text-slate-600 italic">
                                            No abstract — cannot analyze
                                        </span>
                                    )}
                                    {entry.status === "done" && entry.result && (
                                        <span className="text-xs text-emerald-400 font-mono">
                                            +{entry.result.keywords_created}{" "}
                                            keywords added
                                        </span>
                                    )}
                                    {entry.status === "error" && entry.error && (
                                        <span className="text-xs text-red-400">
                                            {entry.error}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {papers.length === 0 && !fetching && (
                <p
                    className="text-xs text-center py-4"
                    style={{ color: theme.colors.text.dim }}
                >
                    Click "Fetch Papers" to load your Zotero library
                </p>
            )}
        </div>
    );
}
