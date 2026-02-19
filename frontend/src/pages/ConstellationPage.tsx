// ═══════════════════════════════════════════════════════════════
// ConstellationPage — NOVAFRAME themed layout
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from "react";
import { theme } from "../design/theme";
import type {
    Keyword,
    EpistemicProfile,
    ArtifactProfile,
} from "../types/keyword";
import { fetchKeywords } from "../api/keywords";
import ConstellationCanvas from "../components/ConstellationCanvas";
import KeywordInspector from "../components/KeywordInspector";
import EpistemicSummary from "../components/EpistemicSummary";

// ─── Derive profiles from active keywords ────────────────────

function deriveProfiles(keywords: Keyword[]): {
    epistemic: EpistemicProfile;
    artifact: ArtifactProfile;
} {
    const active = keywords.filter((k) => k.active);
    const total = active.reduce((s, k) => s + k.weight, 0) || 1;

    const epistemic: EpistemicProfile = {
        exploratory: 0,
        critical: 0,
        problem_solving: 0,
        constructive: 0,
    };
    const artifact: ArtifactProfile = {
        probe: 0,
        critique_device: 0,
        generative_construct: 0,
        solution_system: 0,
        epistemic_mediator: 0,
    };

    for (const kw of active) {
        epistemic[kw.orientation] += kw.weight / total;
        artifact[kw.artifact_role] += kw.weight / total;
    }

    return { epistemic, artifact };
}

// ─── Page component ──────────────────────────────────────────

export default function ConstellationPage() {
    const [keywords, setKeywords] = useState<Keyword[]>([]);
    const [selected, setSelected] = useState<Keyword | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchKeywords()
            .then((res) => setKeywords(res.keywords))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleNodeClick = useCallback(
        (kw: Keyword) => setSelected(kw),
        [],
    );
    const handlePaneClick = useCallback(() => setSelected(null), []);

    const handleUpdated = useCallback(
        (id: string, updates: Partial<Keyword>) => {
            setKeywords((prev) =>
                prev.map((kw) => (kw.id === id ? { ...kw, ...updates } : kw)),
            );
            setSelected((prev) =>
                prev && prev.id === id ? { ...prev, ...updates } : prev,
            );
        },
        [],
    );

    const handleSync = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchKeywords();
            setKeywords(res.keywords);
        } catch (err) {
            console.error("Sync failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const profiles = useMemo(() => deriveProfiles(keywords), [keywords]);

    if (loading && keywords.length === 0) {
        return (
            <div
                className={`flex items-center justify-center h-screen ${theme.layout.mainBg}`}
            >
                <span className={theme.typography.subheading}>
                    Loading constellation…
                </span>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-screen ${theme.layout.mainBg}`}>
            {/* Toolbar */}
            <header
                className={`${theme.layout.headerHeight} flex items-center justify-between px-6 border-b ${theme.layout.glassBorder} ${theme.layout.panelBg} ${theme.layout.glassEffect}`}
            >
                <h2 className={theme.typography.heading} style={{ fontSize: 18 }}>
                    Constellation Map
                </h2>
                <div className="flex items-center gap-3">
                    <span className={theme.typography.mono} style={{ color: theme.colors.text.dim }}>
                        {keywords.length} keywords • {keywords.filter((k) => k.active).length} active
                    </span>
                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className={theme.components.buttonGhost}
                    >
                        {loading ? "Syncing…" : "↻ Sync"}
                    </button>
                </div>
            </header>

            {/* Main layout: canvas + aside */}
            <div className="flex flex-1 overflow-hidden">
                {/* Canvas */}
                <div className="flex-1">
                    <ConstellationCanvas
                        keywords={keywords}
                        onNodeClick={handleNodeClick}
                        onPaneClick={handlePaneClick}
                    />
                </div>

                {/* Right aside */}
                <aside
                    className={`${theme.layout.asideWidth} ${theme.layout.detailSidebar} border-l ${theme.layout.glassBorder} overflow-y-auto p-4 space-y-4 ${theme.layout.scrollbar}`}
                >
                    <EpistemicSummary
                        epistemicProfile={profiles.epistemic}
                        artifactProfile={profiles.artifact}
                    />

                    <KeywordInspector
                        keyword={selected}
                        onClose={handlePaneClick}
                        onUpdated={handleUpdated}
                    />
                </aside>
            </div>
        </div>
    );
}
