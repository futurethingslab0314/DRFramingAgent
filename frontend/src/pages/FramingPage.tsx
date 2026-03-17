import { useCallback, useState } from "react";
import { theme } from "../design/theme";
import type {
    FramingRunResponse,
    FramingWorkspacePreview,
} from "../types/framing";
import ChatPanel from "../components/ChatPanel";
import FramingCard from "../components/FramingCard";
import { useI18n } from "../i18n/useI18n";

function PreviewPanel({ preview }: { preview: FramingWorkspacePreview }) {
    const { t } = useI18n();

    return (
        <div className="space-y-4">
            <div className={theme.components.innerCard}>
                <div className={theme.typography.subheading}>{t("preview.guidance")}</div>
                <div className="mt-3 text-sm text-slate-100">{preview.ideaSeed}</div>
                {preview.expansion && (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {[
                            [
                                t("chat.guidance.lenses"),
                                preview.expansion.lenses
                                    .filter((item) =>
                                        preview.selectedLensIds.includes(item.id),
                                    )
                                    .map((item) => item.label),
                            ],
                            [
                                t("chat.guidance.contexts"),
                                preview.expansion.contexts
                                    .filter((item) =>
                                        preview.selectedContextIds.includes(item.id),
                                    )
                                    .map((item) => item.label),
                            ],
                            [
                                t("chat.guidance.tensions"),
                                preview.expansion.tensions
                                    .filter((item) =>
                                        preview.selectedTensionIds.includes(item.id),
                                    )
                                    .map((item) => item.label),
                            ],
                        ].map(([label, values]) => (
                            <div key={String(label)} className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3">
                                <div className={theme.typography.label} style={{ color: theme.colors.accent }}>
                                    {label}
                                </div>
                                <div className="mt-2 text-sm text-slate-200">
                                    {(values as string[]).length > 0
                                        ? (values as string[]).join(", ")
                                        : "—"}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {preview.canvas && (
                <div className={theme.components.innerCard}>
                    <div className={theme.typography.subheading}>{t("preview.canvas")}</div>
                    <div className="mt-4 space-y-3">
                        {(
                            [
                                ["chat.canvas.topic", preview.canvas.topic],
                                ["chat.canvas.context", preview.canvas.context],
                                ["chat.canvas.gap", preview.canvas.gap],
                                ["chat.canvas.question", preview.canvas.question],
                                ["chat.canvas.method", preview.canvas.method],
                            ] as const
                        ).map(([key, value]) => (
                            <div key={key}>
                                <div
                                    className={theme.typography.label}
                                    style={{ color: theme.colors.accent }}
                                >
                                    {t(key as never)}
                                </div>
                                <div className="mt-1 text-sm text-slate-200">
                                    {value || "—"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function FramingPage() {
    const [result, setResult] = useState<FramingRunResponse | null>(null);
    const [owner, setOwner] = useState<string | undefined>(undefined);
    const [preview, setPreview] = useState<FramingWorkspacePreview | null>(null);
    const { t } = useI18n();

    const handleResult = useCallback((res: FramingRunResponse, ownerValue?: string) => {
        setResult(res);
        setOwner(ownerValue);
    }, []);

    return (
        <div className={`flex h-full min-h-0 flex-col ${theme.layout.mainBg}`}>
            <header
                className={`${theme.layout.headerHeight} shrink-0 flex items-center px-6 border-b ${theme.layout.glassBorder} ${theme.layout.panelBg} ${theme.layout.glassEffect}`}
            >
                <h2 className={theme.typography.heading} style={{ fontSize: 18 }}>
                    {t("framing.header")}
                </h2>
            </header>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                <div
                    className={`${theme.layout.asideWidth} flex min-h-0 flex-col border-r ${theme.layout.glassBorder} p-4`}
                >
                    <ChatPanel
                        onResult={handleResult}
                        onPreviewChange={setPreview}
                    />
                </div>

                <div className={`flex-1 overflow-y-auto p-6 pb-10 ${theme.layout.scrollbar}`}>
                    {result ? (
                        <FramingCard result={result} owner={owner} />
                    ) : preview ? (
                        <PreviewPanel preview={preview} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <p
                                className={theme.typography.body}
                                style={{ color: theme.colors.text.muted }}
                            >
                                {t("framing.empty.primary")}{" "}
                                <strong style={{ color: theme.colors.text.normal }}>
                                    {t("chat.expand")}
                                </strong>
                            </p>
                            <p
                                className={`${theme.typography.mono} mt-2`}
                                style={{ color: theme.colors.text.muted }}
                            >
                                {t("framing.empty.secondary")}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
