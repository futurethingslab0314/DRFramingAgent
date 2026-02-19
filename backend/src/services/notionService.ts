// ═══════════════════════════════════════════════════════════════
// NotionService — read/write keywords (DB2) and framing (DB1)
// ═══════════════════════════════════════════════════════════════

import { Client } from "@notionhq/client";

import type {
    Keyword,
    Orientation,
    ArtifactRole,
    PipelineRole,
} from "../schema/framingConstellationBot.js";

// ─── Notion client singleton ─────────────────────────────────

let _client: Client | null = null;

function notion(): Client {
    if (!_client) {
        const auth = process.env.NOTION_API_KEY;
        if (!auth) throw new Error("NOTION_API_KEY is not set");
        _client = new Client({ auth });
    }
    return _client;
}

function db1Id(): string {
    const id = process.env.NOTION_DB1_ID;
    if (!id) throw new Error("NOTION_DB1_ID is not set");
    return id;
}

function db2Id(): string {
    const id = process.env.NOTION_DB2_ID;
    if (!id) throw new Error("NOTION_DB2_ID is not set");
    return id;
}

// ─── DB2 property name constants ─────────────────────────────
// Adjust these if your Notion DB uses different column names.

const DB2 = {
    TERM: "Term",
    ORIENTATION: "Orientation",
    ARTIFACT_ROLE: "Artifact Role",
    PIPELINE_ROLE: "Pipeline Role",
    WEIGHT: "Weight",
    ACTIVE: "Active",
    NOTES: "Notes",
    SOURCE: "Source",
    UPDATED_BY: "Updated By",
} as const;

// ─── DB1 property name constants ─────────────────────────────

const DB1 = {
    TITLE: "Title",
    RESEARCH_QUESTION: "Research Question",
    BACKGROUND: "Background",
    PURPOSE: "Purpose",
    METHOD: "Method",
    RESULT: "Result",
    CONTRIBUTION: "Contribution",
    ABSTRACT_EN: "Abstract EN",
    ABSTRACT_ZH: "Abstract ZH",
} as const;

// ─── Helpers ─────────────────────────────────────────────────

function getPlainText(prop: unknown): string {
    const p = prop as { type?: string; title?: Array<{ plain_text: string }>; rich_text?: Array<{ plain_text: string }> } | undefined;
    if (!p) return "";
    if (p.type === "title" && p.title) {
        return p.title.map((t) => t.plain_text).join("");
    }
    if (p.type === "rich_text" && p.rich_text) {
        return p.rich_text.map((t) => t.plain_text).join("");
    }
    return "";
}

function getSelect(prop: unknown): string {
    const p = prop as { type?: string; select?: { name: string } | null } | undefined;
    if (p?.type === "select" && p.select) return p.select.name;
    return "";
}

function getNumber(prop: unknown): number {
    const p = prop as { type?: string; number?: number | null } | undefined;
    if (p?.type === "number" && p.number !== null && p.number !== undefined) return p.number;
    return 1.0;
}

function getCheckbox(prop: unknown): boolean {
    const p = prop as { type?: string; checkbox?: boolean } | undefined;
    if (p?.type === "checkbox") return p.checkbox ?? true;
    return true;
}

const VALID_ORIENTATIONS = new Set<string>([
    "exploratory", "critical", "problem_solving", "constructive",
]);
const VALID_ARTIFACT_ROLES = new Set<string>([
    "probe", "critique_device", "generative_construct", "solution_system", "epistemic_mediator",
]);
const VALID_PIPELINE_ROLES = new Set<string>([
    "rq_trigger", "method_bias", "contribution_frame", "tone_modifier",
]);

// ─── DB2: Keywords ───────────────────────────────────────────

export interface NotionKeyword extends Keyword {
    /** Notion page ID — needed for PATCH updates */
    id: string;
    source?: string;
    updated_by?: string;
}

/**
 * Fetch all keywords from Notion DB2.
 */
export async function fetchKeywordsFromDB2(): Promise<NotionKeyword[]> {
    const results: NotionKeyword[] = [];
    let cursor: string | undefined = undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const response = await notion().databases.query({
            database_id: db2Id(),
            start_cursor: cursor,
            page_size: 100,
        });

        for (const page of response.results) {
            if (!("properties" in page)) continue;
            const props = page.properties as Record<string, unknown>;

            const term = getPlainText(props[DB2.TERM]);
            if (!term) continue;

            const orientationRaw = getSelect(props[DB2.ORIENTATION]).toLowerCase().replace(/ /g, "_");
            const artifactRoleRaw = getSelect(props[DB2.ARTIFACT_ROLE]).toLowerCase().replace(/ /g, "_");
            const pipelineRoleRaw = getSelect(props[DB2.PIPELINE_ROLE]).toLowerCase().replace(/ /g, "_");

            if (!VALID_ORIENTATIONS.has(orientationRaw)) continue;
            if (!VALID_ARTIFACT_ROLES.has(artifactRoleRaw)) continue;

            results.push({
                id: page.id,
                term,
                orientation: orientationRaw as Orientation,
                artifact_role: artifactRoleRaw as ArtifactRole,
                pipeline_role: VALID_PIPELINE_ROLES.has(pipelineRoleRaw)
                    ? (pipelineRoleRaw as PipelineRole)
                    : undefined,
                weight: getNumber(props[DB2.WEIGHT]),
                active: getCheckbox(props[DB2.ACTIVE]),
                notes: getPlainText(props[DB2.NOTES]) || undefined,
                source: getPlainText(props[DB2.SOURCE]) || undefined,
                updated_by: getPlainText(props[DB2.UPDATED_BY]) || undefined,
            });
        }

        if (!response.has_more) break;
        cursor = response.next_cursor ?? undefined;
    }

    return results;
}

/**
 * Write suggested keywords to Notion DB2 (active: false by default).
 */
export async function writeKeywordsToDB2(
    keywords: Array<{
        term: string;
        orientation: Orientation;
        artifact_role: ArtifactRole;
        weight?: number;
        notes?: string;
        source?: string;
    }>,
): Promise<string[]> {
    const pageIds: string[] = [];

    for (const kw of keywords) {
        const response = await notion().pages.create({
            parent: { database_id: db2Id() },
            properties: {
                [DB2.TERM]: {
                    title: [{ text: { content: kw.term } }],
                },
                [DB2.ORIENTATION]: {
                    select: { name: kw.orientation },
                },
                [DB2.ARTIFACT_ROLE]: {
                    select: { name: kw.artifact_role },
                },
                [DB2.WEIGHT]: {
                    number: kw.weight ?? 1.0,
                },
                [DB2.ACTIVE]: {
                    checkbox: false,
                },
                ...(kw.notes
                    ? {
                        [DB2.NOTES]: {
                            rich_text: [{ text: { content: kw.notes } }],
                        },
                    }
                    : {}),
                ...(kw.source
                    ? {
                        [DB2.SOURCE]: {
                            rich_text: [{ text: { content: kw.source } }],
                        },
                    }
                    : {}),
            },
        });

        pageIds.push(response.id);
    }

    return pageIds;
}

/**
 * Update a keyword page in Notion DB2.
 */
export async function updateKeywordInDB2(
    pageId: string,
    updates: Partial<{
        active: boolean;
        weight: number;
        orientation: Orientation;
        artifact_role: ArtifactRole;
        pipeline_role: PipelineRole;
        notes: string;
    }>,
): Promise<void> {
    const properties: Record<string, unknown> = {};

    if (updates.active !== undefined) {
        properties[DB2.ACTIVE] = { checkbox: updates.active };
    }
    if (updates.weight !== undefined) {
        properties[DB2.WEIGHT] = { number: updates.weight };
    }
    if (updates.orientation !== undefined) {
        properties[DB2.ORIENTATION] = { select: { name: updates.orientation } };
    }
    if (updates.artifact_role !== undefined) {
        properties[DB2.ARTIFACT_ROLE] = { select: { name: updates.artifact_role } };
    }
    if (updates.pipeline_role !== undefined) {
        properties[DB2.PIPELINE_ROLE] = { select: { name: updates.pipeline_role } };
    }
    if (updates.notes !== undefined) {
        properties[DB2.NOTES] = {
            rich_text: [{ text: { content: updates.notes } }],
        };
    }

    await notion().pages.update({
        page_id: pageId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: properties as any,
    });
}

// ─── DB1: Framing Results ────────────────────────────────────

export interface FramingResult {
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
    abstract_en: string;
    abstract_zh: string;
}

/**
 * Write a framing result to Notion DB1.
 */
export async function writeFramingToDB1(
    framing: FramingResult,
    title?: string,
): Promise<string> {
    const response = await notion().pages.create({
        parent: { database_id: db1Id() },
        properties: {
            [DB1.TITLE]: {
                title: [{ text: { content: title ?? framing.research_question.slice(0, 80) } }],
            },
            [DB1.RESEARCH_QUESTION]: {
                rich_text: [{ text: { content: framing.research_question } }],
            },
            [DB1.BACKGROUND]: {
                rich_text: [{ text: { content: framing.background } }],
            },
            [DB1.PURPOSE]: {
                rich_text: [{ text: { content: framing.purpose } }],
            },
            [DB1.METHOD]: {
                rich_text: [{ text: { content: framing.method } }],
            },
            [DB1.RESULT]: {
                rich_text: [{ text: { content: framing.result } }],
            },
            [DB1.CONTRIBUTION]: {
                rich_text: [{ text: { content: framing.contribution } }],
            },
            [DB1.ABSTRACT_EN]: {
                rich_text: [{ text: { content: framing.abstract_en } }],
            },
            [DB1.ABSTRACT_ZH]: {
                rich_text: [{ text: { content: framing.abstract_zh } }],
            },
        },
    });

    return response.id;
}
