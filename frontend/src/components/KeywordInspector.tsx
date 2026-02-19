// ═══════════════════════════════════════════════════════════════
// KeywordInspector — aside panel styled with NOVAFRAME theme
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { theme } from "../design/theme";
import type {
    Keyword,
    Orientation,
    ArtifactRole,
    PipelineRole,
} from "../types/keyword";
import { ORIENTATION_COLORS } from "../types/keyword";
import { patchKeyword } from "../api/keywords";

const ORIENTATIONS: Orientation[] = [
    "exploratory",
    "critical",
    "problem_solving",
    "constructive",
];
const ARTIFACT_ROLES: ArtifactRole[] = [
    "probe",
    "critique_device",
    "generative_construct",
    "solution_system",
    "epistemic_mediator",
];
const PIPELINE_ROLES: PipelineRole[] = [
    "rq_trigger",
    "method_bias",
    "contribution_frame",
    "tone_modifier",
];

interface KeywordInspectorProps {
    keyword: Keyword | null;
    onClose: () => void;
    onUpdated: (id: string, updates: Partial<Keyword>) => void;
}

export default function KeywordInspector({
    keyword,
    onClose,
    onUpdated,
}: KeywordInspectorProps) {
    const [draft, setDraft] = useState<Partial<Keyword>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDraft({});
        setError(null);
    }, [keyword?.id]);

    const set = useCallback(
        <K extends keyof Keyword>(key: K, value: Keyword[K]) => {
            setDraft((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    const handleSave = useCallback(async () => {
        if (!keyword || Object.keys(draft).length === 0) return;
        setSaving(true);
        setError(null);
        try {
            await patchKeyword(keyword.id, draft);
            onUpdated(keyword.id, draft);
            setDraft({});
        } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSaving(false);
        }
    }, [keyword, draft, onUpdated]);

    if (!keyword) return null;

    const val = <K extends keyof Keyword>(key: K): Keyword[K] =>
        (draft[key] ?? keyword[key]) as Keyword[K];

    const accentColor = ORIENTATION_COLORS[val("orientation")];

    return (
        <aside className={theme.components.glassCard}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: accentColor }}
                    />
                    <h3
                        className={theme.typography.heading}
                        style={{ fontSize: 16 }}
                    >
                        {keyword.term}
                    </h3>
                </div>
                <button onClick={onClose} className={theme.components.buttonIcon}>
                    ✕
                </button>
            </div>

            {/* Orientation */}
            <div className={`${theme.components.innerCard} mb-3`}>
                <label className={`${theme.typography.label} block mb-1`} style={{ color: theme.colors.text.dim }}>
                    Orientation
                </label>
                <select
                    className={`${theme.components.input} w-full`}
                    value={val("orientation")}
                    onChange={(e) => set("orientation", e.target.value as Orientation)}
                >
                    {ORIENTATIONS.map((o) => (
                        <option key={o} value={o}>
                            {o.replace("_", " ")}
                        </option>
                    ))}
                </select>
            </div>

            {/* Artifact Role */}
            <div className={`${theme.components.innerCard} mb-3`}>
                <label className={`${theme.typography.label} block mb-1`} style={{ color: theme.colors.text.dim }}>
                    Artifact Role
                </label>
                <select
                    className={`${theme.components.input} w-full`}
                    value={val("artifact_role")}
                    onChange={(e) => set("artifact_role", e.target.value as ArtifactRole)}
                >
                    {ARTIFACT_ROLES.map((r) => (
                        <option key={r} value={r}>
                            {r.replace(/_/g, " ")}
                        </option>
                    ))}
                </select>
            </div>

            {/* Pipeline Role */}
            <div className={`${theme.components.innerCard} mb-3`}>
                <label className={`${theme.typography.label} block mb-1`} style={{ color: theme.colors.text.dim }}>
                    Pipeline Role
                </label>
                <select
                    className={`${theme.components.input} w-full`}
                    value={val("pipeline_role") ?? ""}
                    onChange={(e) =>
                        set(
                            "pipeline_role",
                            (e.target.value || undefined) as PipelineRole | undefined,
                        )
                    }
                >
                    <option value="">(none)</option>
                    {PIPELINE_ROLES.map((p) => (
                        <option key={p} value={p}>
                            {p.replace(/_/g, " ")}
                        </option>
                    ))}
                </select>
            </div>

            {/* Weight slider */}
            <div className={`${theme.components.innerCard} mb-3`}>
                <label className={`${theme.typography.label} block mb-1`} style={{ color: theme.colors.text.dim }}>
                    Weight: {val("weight").toFixed(2)}
                </label>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={val("weight")}
                    onChange={(e) => set("weight", parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                />
            </div>

            {/* Active toggle */}
            <div className={`${theme.components.innerCard} mb-3 flex items-center gap-3`}>
                <input
                    type="checkbox"
                    checked={val("active")}
                    onChange={(e) => set("active", e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                />
                <span className={theme.typography.label} style={{ color: theme.colors.text.normal }}>
                    Active
                </span>
            </div>

            {/* Notes */}
            <div className={`${theme.components.innerCard} mb-3`}>
                <label className={`${theme.typography.label} block mb-1`} style={{ color: theme.colors.text.dim }}>
                    Notes
                </label>
                <textarea
                    rows={3}
                    className={`${theme.components.input} w-full resize-none`}
                    value={val("notes") ?? ""}
                    onChange={(e) => set("notes", e.target.value)}
                />
            </div>

            {/* Source badge */}
            {keyword.source && (
                <div className="mb-4">
                    <span className={theme.components.badge} style={{ color: theme.colors.text.dim }}>
                        source: {keyword.source}
                    </span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className={`${theme.typography.mono} mb-3`} style={{ color: theme.colors.danger }}>
                    {error}
                </div>
            )}

            {/* Save button */}
            <button
                className={`${theme.components.buttonPrimary} w-full`}
                onClick={handleSave}
                disabled={saving || Object.keys(draft).length === 0}
            >
                {saving ? "Saving…" : "Save Changes"}
            </button>
        </aside>
    );
}
