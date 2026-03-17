import type { BilingualText } from "../schema/framingConstellationBot.js";

export const REFINE_SYNC_FIELDS = [
    "title",
    "research_question",
    "background",
    "purpose",
    "method",
    "result",
    "contribution",
    "abstract",
] as const;

export type RefineSyncField = (typeof REFINE_SYNC_FIELDS)[number];
export type RefineSyncLanguage = keyof BilingualText;

export type RefineSyncPayload = Record<RefineSyncField, BilingualText>;

function normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

export function extractAuthoritativeFieldChanges(
    current: RefineSyncPayload,
    baseline: RefineSyncPayload,
    authoritativeLanguage: RefineSyncLanguage,
): RefineSyncField[] {
    return REFINE_SYNC_FIELDS.filter((field) => {
        const currentText = normalizeText(current[field][authoritativeLanguage]);
        const baselineText = normalizeText(baseline[field][authoritativeLanguage]);
        return currentText !== baselineText;
    });
}

function parseBilingualValue(
    source: Record<string, unknown>,
    key: RefineSyncField,
): BilingualText {
    const value = source[key];
    if (!value || typeof value !== "object") {
        throw new Error(`Missing object field: "${key}"`);
    }

    const bilingual = value as Record<string, unknown>;
    const en = String(bilingual.en ?? "").trim();
    const zh = String(bilingual.zh ?? "").trim();

    if (!en) throw new Error(`Missing or empty field: "${key}.en"`);
    if (!zh) throw new Error(`Missing or empty field: "${key}.zh"`);

    return { en, zh };
}

export function parseRefinedFramingSyncResponse(raw: string): RefineSyncPayload {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
        title: parseBilingualValue(parsed, "title"),
        research_question: parseBilingualValue(parsed, "research_question"),
        background: parseBilingualValue(parsed, "background"),
        purpose: parseBilingualValue(parsed, "purpose"),
        method: parseBilingualValue(parsed, "method"),
        result: parseBilingualValue(parsed, "result"),
        contribution: parseBilingualValue(parsed, "contribution"),
        abstract: parseBilingualValue(parsed, "abstract"),
    };
}
