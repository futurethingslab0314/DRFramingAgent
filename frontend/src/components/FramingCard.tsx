// ═══════════════════════════════════════════════════════════════
// FramingCard — NOVAFRAME themed framing result display
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { theme } from "../design/theme";
import type { FramingRunResponse } from "../types/framing";
import { FRAMING_FIELDS } from "../types/framing";
import { saveFraming } from "../api/framing";
import EpistemicSummary from "./EpistemicSummary";

interface FramingCardProps {
    result: FramingRunResponse;
}

export default function FramingCard({ result }: FramingCardProps) {
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<string | null>(null);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const res = await saveFraming(result, result.research_question);
            setSaveResult(`Saved → ${res.notion_page_id}`);
        } catch (err) {
            setSaveResult(
                `Error: ${err instanceof Error ? err.message : "save failed"}`,
            );
        } finally {
            setSaving(false);
        }
    }, [result]);

    return (
        <div className="space-y-4">
            {/* Profile charts */}
            <EpistemicSummary
                epistemicProfile={result.epistemic_profile}
                artifactProfile={result.artifact_profile}
            />

            {/* 6 core fields */}
            <div className="space-y-3">
                {FRAMING_FIELDS.map((field) => (
                    <div key={field} className={theme.components.innerCard}>
                        <h4 className={`${theme.typography.label} mb-1`} style={{ color: theme.colors.accent }}>
                            {field.replace(/_/g, " ")}
                        </h4>
                        <p className={theme.typography.body}>
                            {result[field]}
                        </p>
                    </div>
                ))}
            </div>

            {/* Abstracts */}
            <div className="grid grid-cols-2 gap-3">
                <div className={theme.components.innerCard}>
                    <h4 className={`${theme.typography.label} mb-1`} style={{ color: theme.colors.text.dim }}>
                        Abstract (EN)
                    </h4>
                    <p className={theme.typography.body}>{result.abstract_en}</p>
                </div>
                <div className={theme.components.innerCard}>
                    <h4 className={`${theme.typography.label} mb-1`} style={{ color: theme.colors.text.dim }}>
                        摘要 (ZH)
                    </h4>
                    <p className={theme.typography.body}>{result.abstract_zh}</p>
                </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
                <button
                    className={theme.components.buttonPrimary}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Saving…" : "Save to Notion"}
                </button>
                {saveResult && (
                    <span
                        className={theme.typography.mono}
                        style={{
                            color: saveResult.startsWith("Error")
                                ? theme.colors.danger
                                : theme.colors.success,
                        }}
                    >
                        {saveResult}
                    </span>
                )}
            </div>
        </div>
    );
}
