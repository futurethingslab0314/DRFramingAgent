// ═══════════════════════════════════════════════════════════════
// FramingCard — editable framing results + save + AI refine
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import { theme } from "../design/theme";
import type { FramingRunResponse } from "../types/framing";
import { FRAMING_FIELDS, type FramingField } from "../types/framing";
import { saveFraming, refineFraming } from "../api/framing";
import EpistemicSummary from "./EpistemicSummary";

// ─── Field labels ────────────────────────────────────────────

const FIELD_LABELS: Record<FramingField, string> = {
    title: "Title",
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
    owner?: string;
}

// ─── Component ───────────────────────────────────────────────

export default function FramingCard({ result, owner }: FramingCardProps) {
    const [edited, setEdited] = useState<FramingRunResponse>({ ...result });
    const [saving, setSaving] = useState(false);
    const [refining, setRefining] = useState(false);
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

    // Save to Notion DB1
    const handleSave = useCallback(async () => {
        setSaving(true);
        setSaveResult(null);
        try {
            const res = await saveFraming(
                edited,
                edited.title || edited.research_question,
                owner,
            );
            setSaveResult(`✓ Saved → Notion DB1 (${res.notion_page_id.slice(0, 8)}…)`);
            setDirty(false);
        } catch (err) {
            setSaveResult(
                `✗ ${err instanceof Error ? err.message : "save failed"}`,
            );
        } finally {
            setSaving(false);
        }
    }, [edited, owner]);

    // AI Refine
    const handleRefine = useCallback(async () => {
        setRefining(true);
        setSaveResult(null);
        try {
            const refined = await refineFraming({
                research_question: edited.research_question,
                background: edited.background,
                purpose: edited.purpose,
                method: edited.method,
                result: edited.result,
                contribution: edited.contribution,
                abstract_en: edited.abstract_en,
                abstract_zh: edited.abstract_zh,
            });
            setEdited((prev) => ({
                ...prev,
                ...refined,
            }));
            setDirty(true);
            setSaveResult("✓ AI refinement applied — review and save when ready");
        } catch (err) {
            setSaveResult(
                `✗ Refine failed: ${err instanceof Error ? err.message : "unknown error"}`,
            );
        } finally {
            setRefining(false);
        }
    }, [edited]);

    // Reset to original
    const handleReset = useCallback(() => {
        setEdited({ ...result });
        setDirty(false);
        setSaveResult(null);
    }, [result]);

    // Shared textarea style
    const textareaClass =
        "w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-y transition-colors";

    return (
        <div className="flex flex-col">
            {/* ── Sticky Action Bar ─────────────────────────── */}
            <div
                className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 mb-4 rounded-xl border"
                style={{
                    background: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(51, 65, 85, 0.5)",
                }}
            >
                <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                        background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                        color: "#fff",
                        opacity: saving ? 0.6 : 1,
                    }}
                    onClick={handleSave}
                    disabled={saving || refining}
                >
                    {saving ? "⏳ Uploading…" : "📤 Upload to Notion DB1"}
                </button>

                <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                        background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                        color: "#fff",
                        opacity: refining ? 0.6 : 1,
                    }}
                    onClick={handleRefine}
                    disabled={saving || refining}
                >
                    {refining ? "⏳ Refining…" : "✨ AI Refine"}
                </button>

                {dirty && (
                    <button
                        className="px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                        style={{
                            borderColor: "rgba(100, 116, 139, 0.5)",
                            color: "#94a3b8",
                        }}
                        onClick={handleReset}
                        disabled={saving || refining}
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
                            marginLeft: "auto",
                        }}
                    >
                        {saveResult}
                    </span>
                )}
            </div>

            {/* ── Scrollable Content ────────────────────────── */}
            <div className="space-y-4 pb-24 pr-1">
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
                                rows={field === "research_question" || field === "title" ? 2 : 3}
                                className={textareaClass}
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
                            className={textareaClass}
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
                            className={textareaClass}
                            style={{ fontFamily: "inherit", lineHeight: 1.6 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
