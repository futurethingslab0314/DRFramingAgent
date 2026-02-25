// ═══════════════════════════════════════════════════════════════
// FramingCard — editable framing result display + save to Notion
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import { theme } from "../design/theme";
import type { FramingRunResponse } from "../types/framing";
import { FRAMING_FIELDS, type FramingField } from "../types/framing";
import { saveFraming } from "../api/framing";
import EpistemicSummary from "./EpistemicSummary";

// ─── Field labels ────────────────────────────────────────────

const FIELD_LABELS: Record<FramingField, string> = {
    research_question: "Research Question",
    background: "Background",
    purpose: "Purpose",
    method: "Method",
    result: "Result",
    contribution: "Contribution",
};

// ─── Props ───────────────────────────────────────────────────

interface FramingCardProps {
    result: FramingRunResponse;
}

// ─── Component ───────────────────────────────────────────────

export default function FramingCard({ result }: FramingCardProps) {
    // Editable state — cloned from result, user can modify
    const [edited, setEdited] = useState<FramingRunResponse>({ ...result });
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    // Reset when new result arrives
    useEffect(() => {
        setEdited({ ...result });
        setDirty(false);
        setSaveResult(null);
    }, [result]);

    // Field change handler
    const handleFieldChange = useCallback(
        (field: string, value: string) => {
            setEdited((prev) => ({ ...prev, [field]: value }));
            setDirty(true);
            setSaveResult(null);
        },
        [],
    );

    // Save handler — saves edited version
    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const res = await saveFraming(edited, edited.research_question);
            setSaveResult(`✓ Saved → Notion DB1 (${res.notion_page_id.slice(0, 8)}…)`);
            setDirty(false);
        } catch (err) {
            setSaveResult(
                `✗ ${err instanceof Error ? err.message : "save failed"}`,
            );
        } finally {
            setSaving(false);
        }
    }, [edited]);

    // Reset to original
    const handleReset = useCallback(() => {
        setEdited({ ...result });
        setDirty(false);
        setSaveResult(null);
    }, [result]);

    return (
        <div className="space-y-4">
            {/* Profile charts */}
            <EpistemicSummary
                epistemicProfile={result.epistemic_profile}
                artifactProfile={result.artifact_profile}
            />

            {/* 6 core editable fields */}
            <div className="space-y-3">
                {FRAMING_FIELDS.map((field) => (
                    <div key={field} className={theme.components.innerCard}>
                        <label
                            className={`${theme.typography.label} block mb-1`}
                            style={{ color: theme.colors.accent }}
                        >
                            {FIELD_LABELS[field]}
                        </label>
                        <textarea
                            value={edited[field]}
                            onChange={(e) =>
                                handleFieldChange(field, e.target.value)
                            }
                            rows={field === "research_question" ? 2 : 3}
                            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-y transition-colors"
                            style={{ fontFamily: "inherit", lineHeight: 1.6 }}
                        />
                    </div>
                ))}
            </div>

            {/* Abstracts — also editable */}
            <div className="grid grid-cols-2 gap-3">
                <div className={theme.components.innerCard}>
                    <label
                        className={`${theme.typography.label} block mb-1`}
                        style={{ color: theme.colors.text.dim }}
                    >
                        Abstract (EN)
                    </label>
                    <textarea
                        value={edited.abstract_en}
                        onChange={(e) =>
                            handleFieldChange("abstract_en", e.target.value)
                        }
                        rows={5}
                        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-y transition-colors"
                        style={{ fontFamily: "inherit", lineHeight: 1.6 }}
                    />
                </div>
                <div className={theme.components.innerCard}>
                    <label
                        className={`${theme.typography.label} block mb-1`}
                        style={{ color: theme.colors.text.dim }}
                    >
                        摘要 (ZH)
                    </label>
                    <textarea
                        value={edited.abstract_zh}
                        onChange={(e) =>
                            handleFieldChange("abstract_zh", e.target.value)
                        }
                        rows={5}
                        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-y transition-colors"
                        style={{ fontFamily: "inherit", lineHeight: 1.6 }}
                    />
                </div>
            </div>

            {/* Actions: Save + Reset */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    className={theme.components.buttonPrimary}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Uploading…" : "📤 Upload to Notion DB1"}
                </button>

                {dirty && (
                    <button
                        className={theme.components.buttonGhost}
                        onClick={handleReset}
                    >
                        ↩ Reset
                    </button>
                )}

                {saveResult && (
                    <span
                        className={theme.typography.mono}
                        style={{
                            color: saveResult.startsWith("✗")
                                ? theme.colors.danger
                                : theme.colors.success,
                            fontSize: "12px",
                        }}
                    >
                        {saveResult}
                    </span>
                )}
            </div>
        </div>
    );
}
