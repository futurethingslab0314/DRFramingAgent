// ═══════════════════════════════════════════════════════════════
// ZoteroReader — fetch papers from Zotero libraries or a single collection
// ═══════════════════════════════════════════════════════════════

const ZOTERO_BASE = "https://api.zotero.org";

// ─── Types ───────────────────────────────────────────────────

export interface ZoteroPaper {
    key: string;
    title: string;
    abstract: string;
    tags: string[];
    year?: number;
    doi?: string;
}

interface ZoteroItemData {
    key: string;
    title?: string;
    abstractNote?: string;
    date?: string;
    DOI?: string;
    tags?: Array<{ tag: string }>;
    itemType?: string;
}

// ─── Config ──────────────────────────────────────────────────

function getConfig() {
    const apiKey = process.env.ZOTERO_API_KEY;
    const userId = process.env.ZOTERO_USER_ID;
    const groupIds = (process.env.ZOTERO_GROUP_IDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const collectionUrl = (process.env.ZOTERO_COLLECTION_URL ?? "").trim();

    if (!apiKey) throw new Error("ZOTERO_API_KEY is not set");

    let collectionTarget:
        | { libraryType: "groups"; libraryId: string; collectionKey: string }
        | undefined;

    if (collectionUrl) {
        const match = collectionUrl.match(
            /zotero\.org\/groups\/(\d+)\/[^/]+\/collections\/([A-Z0-9]+)\/collection/i,
        );
        if (!match) {
            throw new Error(
                "ZOTERO_COLLECTION_URL format is invalid. Expected: https://www.zotero.org/groups/<groupId>/<groupName>/collections/<collectionKey>/collection",
            );
        }
        collectionTarget = {
            libraryType: "groups",
            libraryId: match[1],
            collectionKey: match[2].toUpperCase(),
        };
    }

    if (!collectionTarget && !userId) {
        throw new Error(
            "ZOTERO_USER_ID is not set (required when ZOTERO_COLLECTION_URL is not provided)",
        );
    }

    return { apiKey, userId, groupIds, collectionTarget };
}

// ─── Fetch helpers ───────────────────────────────────────────

async function fetchPage(
    url: string,
    apiKey: string,
    start = 0,
    limit = 100,
): Promise<{ items: ZoteroItemData[]; totalResults: number }> {
    const sep = url.includes("?") ? "&" : "?";
    const fullUrl = `${url}${sep}format=json&start=${start}&limit=${limit}`;

    const res = await fetch(fullUrl, {
        headers: {
            "Zotero-API-Key": apiKey,
            "Zotero-API-Version": "3",
        },
    });

    if (!res.ok) {
        throw new Error(`Zotero API error: ${res.status} ${res.statusText}`);
    }

    const totalResults = parseInt(res.headers.get("Total-Results") ?? "0", 10);
    const data = (await res.json()) as Array<{ key: string; data: ZoteroItemData }>;

    const items = data.map((d) => ({ ...d.data, key: d.key }));
    return { items, totalResults };
}

async function fetchAllItems(
    baseUrl: string,
    apiKey: string,
): Promise<ZoteroItemData[]> {
    const allItems: ZoteroItemData[] = [];
    let start = 0;
    const limit = 100;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { items, totalResults } = await fetchPage(baseUrl, apiKey, start, limit);
        allItems.push(...items);
        start += limit;
        if (start >= totalResults) break;
    }

    return allItems;
}

// ─── Transform ───────────────────────────────────────────────

function toZoteroPaper(item: ZoteroItemData): ZoteroPaper | null {
    // Skip attachments, notes, etc.
    if (
        item.itemType === "attachment" ||
        item.itemType === "note" ||
        item.itemType === "annotation"
    ) {
        return null;
    }

    const title = (item.title ?? "").trim();
    if (!title) return null;

    const yearMatch = (item.date ?? "").match(/\d{4}/);

    return {
        key: item.key,
        title,
        abstract: (item.abstractNote ?? "").trim(),
        tags: (item.tags ?? []).map((t) => t.tag),
        year: yearMatch ? parseInt(yearMatch[0], 10) : undefined,
        doi: item.DOI ?? undefined,
    };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Fetch papers from a single Zotero library.
 */
export async function fetchItems(
    libraryType: "users" | "groups",
    libraryId: string,
    collectionKey?: string,
): Promise<ZoteroPaper[]> {
    const { apiKey } = getConfig();
    const url = collectionKey
        ? `${ZOTERO_BASE}/${libraryType}/${libraryId}/collections/${collectionKey}/items`
        : `${ZOTERO_BASE}/${libraryType}/${libraryId}/items`;
    const raw = await fetchAllItems(url, apiKey);

    return raw
        .map(toZoteroPaper)
        .filter((p): p is ZoteroPaper => p !== null);
}

/**
 * Fetch papers from all configured libraries (user + groups),
 * deduplicate by DOI or title.
 */
export async function fetchAllLibraries(): Promise<ZoteroPaper[]> {
    const { userId, groupIds, collectionTarget } = getConfig();

    // Collection mode: only fetch this single Zotero collection.
    if (collectionTarget) {
        return fetchItems(
            collectionTarget.libraryType,
            collectionTarget.libraryId,
            collectionTarget.collectionKey,
        );
    }

    const promises: Promise<ZoteroPaper[]>[] = [
        fetchItems("users", userId!),
        ...groupIds.map((gid) => fetchItems("groups", gid)),
    ];

    const results = await Promise.all(promises);
    const all = results.flat();

    // Dedup by DOI first, then title
    const seen = new Set<string>();
    const deduped: ZoteroPaper[] = [];

    for (const paper of all) {
        const dedupeKey = paper.doi
            ? `doi:${paper.doi.toLowerCase()}`
            : `title:${paper.title.toLowerCase()}`;

        if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            deduped.push(paper);
        }
    }

    return deduped;
}
