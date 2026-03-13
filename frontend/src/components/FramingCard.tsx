// ═══════════════════════════════════════════════════════════════
// FramingCard — editable bilingual framing results + save + refine
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import { theme } from "../design/theme";
import type {
    BilingualText,
    FramingRunResponse,
    FramingField,
} from "../types/framing";
import { FRAMING_FIELDS } from "../types/framing";
import { saveFraming, refineFraming } from "../api/framing";
import EpistemicSummary from "./EpistemicSummary";
import { useI18n } from "../i18n/useI18n";

const FIELD_LABEL_KEYS: Record<FramingField, string> = {
    title: "field.title",
    research_question: "field.research_question",
    background: "field.background",
    purpose: "field.purpose",
    method: "field.method",
    result: "field.result",
    contribution: "field.contribution",
};

interface FramingCardProps {
    result: FramingRunResponse;
    owner?: string;
}

export default function FramingCard({ result, owner }: FramingCardProps) {
    const { t } = useI18n();
    const [edited, setEdited] = useState<FramingRunResponse>({ ...result });
    const [saving, setSaving] = useState(false);
    const [refining, setRefining] = useState(false);
    const [saveResult, setSaveResult] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setEdited({ ...result });
        setDirty(false);
        setSaveResult(null);
    }, [result]);

    const handleBilingualFieldChange = useCallback(
        (field: FramingField | "abstract", language: keyof BilingualText, value: string) => {
            setEdited((prev) => ({
                ...prev,
                [field]: {
                    ...prev[field],
                    [language]: value,
                },
            }));
            setDirty(true);
            setSaveResult(null);
        },
        [],
    );

    const handleSave = useCallback(async () => {
        setSaving(true);
        setSaveResult(null);
        try {
            const res = await saveFraming(
                edited,
                edited.title.en || edited.research_question.en,
                owner,
            );
            setSaveResult(`${t("card.saved")} (${res.notion_page_id.slice(0, 8)}…)`);
            setDirty(false);
        } catch (err) {
            setSaveResult(
                `✗ ${err instanceof Error ? err.message : "save failed"}`,
            );
        } finally {
            setSaving(false);
        }
    }, [edited, owner, t]);

    const handleRefine = useCallback(async () => {
        setRefining(true);
        setSaveResult(null);
        try {
            const refined = await refineFraming(edited);
            setEdited(refined);
            setDirty(true);
            setSaveResult(t("card.refine.applied"));
        } catch (err) {
            setSaveResult(
                `✗ ${err instanceof Error ? err.message : "unknown error"}`,
            );
        } finally {
            setRefining(false);
        }
    }, [edited, t]);

    const handleReset = useCallback(() => {
        setEdited({ ...result });
        setDirty(false);
        setSaveResult(null);
    }, [result]);

    const textareaClass =
        "w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-y transition-colors";

    return (
        <div className="flex flex-col">
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
                    {saving ? t("card.saving") : t("card.save")}
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
                    {refining ? t("card.refining") : t("card.refine")}
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
                        {t("card.reset")}
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

            <div className="space-y-4 pb-24 pr-1">
                <EpistemicSummary
                    epistemicProfile={result.epistemic_profile}
                    artifactProfile={result.artifact_profile}
                />

                <div className="space-y-3">
                    {FRAMING_FIELDS.map((field) => (
                        <div key={field} className={theme.components.innerCard}>
                            <label
                                className={`${theme.typography.label} block mb-3`}
                                style={{ color: theme.colors.accent }}
                            >
                                {t(FIELD_LABEL_KEYS[field] as never)}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {(["en", "zh"] as const).map((language) => (
                                    <div key={language}>
                                        <div
                                            className={`${theme.typography.mono} mb-1`}
                                            style={{ color: theme.colors.text.dim }}
                                        >
                                            {language === "en"
                                                ? t("field.english")
                                                : t("field.chinese")}
                                        </div>
                                        <textarea
                                            value={edited[field][language]}
                                            onChange={(e) =>
                                                handleBilingualFieldChange(
                                                    field,
                                                    language,
                                                    e.target.value,
                                                )
                                            }
                                            rows={field === "research_question" || field === "title" ? 2 : 3}
                                            className={textareaClass}
                                            style={{ fontFamily: "inherit", lineHeight: 1.6 }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={theme.components.innerCard}>
                    <label
                        className={`${theme.typography.label} block mb-3`}
                        style={{ color: theme.colors.text.dim }}
                    >
                        {t("field.abstract")}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {(["en", "zh"] as const).map((language) => (
                            <div key={language}>
                                <div
                                    className={`${theme.typography.mono} mb-1`}
                                    style={{ color: theme.colors.text.dim }}
                                >
                                    {language === "en"
                                        ? t("field.english")
                                        : t("field.chinese")}
                                </div>
                                <textarea
                                    value={edited.abstract[language]}
                                    onChange={(e) =>
                                        handleBilingualFieldChange(
                                            "abstract",
                                            language,
                                            e.target.value,
                                        )
                                    }
                                    rows={5}
                                    className={textareaClass}
                                    style={{ fontFamily: "inherit", lineHeight: 1.6 }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
