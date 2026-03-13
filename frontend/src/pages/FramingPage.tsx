// ═══════════════════════════════════════════════════════════════
// FramingPage — NOVAFRAME themed framing workspace
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { theme } from "../design/theme";
import type { FramingRunResponse } from "../types/framing";
import ChatPanel from "../components/ChatPanel";
import FramingCard from "../components/FramingCard";
import { useI18n } from "../i18n/useI18n";

export default function FramingPage() {
    const [result, setResult] = useState<FramingRunResponse | null>(null);
    const [owner, setOwner] = useState<string | undefined>(undefined);
    const { t } = useI18n();

    const handleResult = useCallback((res: FramingRunResponse, ownerValue?: string) => {
        setResult(res);
        setOwner(ownerValue);
    }, []);

    return (
        <div className={`flex flex-col h-screen ${theme.layout.mainBg}`}>
            {/* Header */}
            <header
                className={`${theme.layout.headerHeight} flex items-center px-6 border-b ${theme.layout.glassBorder} ${theme.layout.panelBg} ${theme.layout.glassEffect}`}
            >
                <h2 className={theme.typography.heading} style={{ fontSize: 18 }}>
                    {t("framing.header")}
                </h2>
            </header>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: input panel */}
                <div
                    className={`${theme.layout.asideWidth} border-r ${theme.layout.glassBorder} overflow-y-auto p-4 ${theme.layout.scrollbar}`}
                >
                    <ChatPanel onResult={handleResult} />
                </div>

                {/* Right: result */}
                <div
                    className={`flex-1 overflow-y-auto p-6 pb-10 ${theme.layout.scrollbar}`}
                >
                    {result ? (
                        <FramingCard result={result} owner={owner} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <p
                                className={theme.typography.body}
                                style={{ color: theme.colors.text.muted }}
                            >
                                {t("framing.empty.primary")}{" "}
                                <strong style={{ color: theme.colors.text.normal }}>
                                    {t("framing.empty.action")}
                                </strong>{" "}
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
