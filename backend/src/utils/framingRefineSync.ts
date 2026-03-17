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

const FULL_REALIGNMENT_FIELDS = new Set<RefineSyncField>([
    "research_question",
    "purpose",
    "method",
]);

export type RefineSyncField = (typeof REFINE_SYNC_FIELDS)[number];
export type RefineSyncLanguage = keyof BilingualText;

export type RefineSyncPayload = Record<RefineSyncField, BilingualText>;

interface AuthoritativePreservationInput {
    current: RefineSyncPayload;
    refined: RefineSyncPayload;
    authoritativeLanguage: RefineSyncLanguage;
    authoritativeChangedFields: RefineSyncField[];
}

function normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function extractSemanticUnits(value: string): string[] {
    const normalized = normalizeText(value).toLowerCase();
    const latinUnits = normalized.match(/[a-z0-9]{2,}/g) ?? [];
    const cjkChars = Array.from(normalized.matchAll(/[\p{Script=Han}]/gu), (match) => match[0]);
    const cjkBigrams: string[] = [];

    for (let i = 0; i < cjkChars.length - 1; i += 1) {
        cjkBigrams.push(`${cjkChars[i]}${cjkChars[i + 1]}`);
    }

    return [...latinUnits, ...cjkBigrams];
}

function computeOverlapRatio(source: string, candidate: string): number {
    const sourceUnits = extractSemanticUnits(source);
    if (sourceUnits.length === 0) {
        return normalizeText(source) === normalizeText(candidate) ? 1 : 0;
    }

    const candidateUnitSet = new Set(extractSemanticUnits(candidate));
    let overlapCount = 0;
    for (const unit of sourceUnits) {
        if (candidateUnitSet.has(unit)) {
            overlapCount += 1;
        }
    }

    return overlapCount / sourceUnits.length;
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

export function shouldFullyRealignFraming(
    authoritativeChangedFields: RefineSyncField[],
): boolean {
    return authoritativeChangedFields.some((field) =>
        FULL_REALIGNMENT_FIELDS.has(field),
    );
}

export function enforceAuthoritativeFieldPreservation(
    input: AuthoritativePreservationInput,
): RefineSyncPayload {
    const {
        current,
        refined,
        authoritativeLanguage,
        authoritativeChangedFields,
    } = input;

    const next: RefineSyncPayload = structuredClone(refined);

    for (const field of authoritativeChangedFields) {
        const currentText = current[field][authoritativeLanguage];
        const refinedText = refined[field][authoritativeLanguage];
        const overlapRatio = computeOverlapRatio(currentText, refinedText);

        if (overlapRatio < 0.45) {
            next[field][authoritativeLanguage] = currentText;
        }
    }

    return next;
}
