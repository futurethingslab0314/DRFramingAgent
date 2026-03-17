import test from "node:test";
import assert from "node:assert/strict";

import {
    extractAuthoritativeFieldChanges,
    parseRefinedFramingSyncResponse,
} from "./framingRefineSync.js";

function buildFramingFixture() {
    return {
        title: { en: "Original title", zh: "原始標題" },
        research_question: { en: "Original RQ", zh: "原始研究問題" },
        background: { en: "Original background", zh: "原始背景" },
        purpose: { en: "Original purpose", zh: "原始目的" },
        method: { en: "Original method", zh: "原始方法" },
        result: { en: "Original result", zh: "原始結果" },
        contribution: { en: "Original contribution", zh: "原始貢獻" },
        abstract: { en: "Original abstract", zh: "原始摘要" },
    };
}

test("extractAuthoritativeFieldChanges only tracks edits in the selected language", () => {
    const baseline = buildFramingFixture();
    const current = buildFramingFixture();

    current.purpose.zh = "我重新寫過的研究目的";
    current.method.en = "A rewritten method that should be ignored";

    assert.deepEqual(
        extractAuthoritativeFieldChanges(current, baseline, "zh"),
        ["purpose"],
    );
});

test("extractAuthoritativeFieldChanges keeps the selected language authoritative when both sides changed", () => {
    const baseline = buildFramingFixture();
    const current = buildFramingFixture();

    current.research_question.en = "Changed English research question";
    current.research_question.zh = "改寫後的中文研究問題";

    assert.deepEqual(
        extractAuthoritativeFieldChanges(current, baseline, "zh"),
        ["research_question"],
    );
});

test("parseRefinedFramingSyncResponse returns complete bilingual fields", () => {
    const parsed = parseRefinedFramingSyncResponse(
        JSON.stringify({
            title: { en: "Synced title", zh: "同步標題" },
            research_question: { en: "Synced RQ", zh: "同步研究問題" },
            background: { en: "Synced background", zh: "同步背景" },
            purpose: { en: "Synced purpose", zh: "同步目的" },
            method: { en: "Synced method", zh: "同步方法" },
            result: { en: "Synced result", zh: "同步結果" },
            contribution: { en: "Synced contribution", zh: "同步貢獻" },
            abstract: { en: "Synced abstract", zh: "同步摘要" },
        }),
    );

    assert.equal(parsed.method.zh, "同步方法");
    assert.equal(parsed.abstract.en, "Synced abstract");
});

test("parseRefinedFramingSyncResponse rejects missing bilingual values", () => {
    assert.throws(
        () =>
            parseRefinedFramingSyncResponse(
                JSON.stringify({
                    title: { en: "Synced title", zh: "同步標題" },
                    research_question: { en: "Synced RQ", zh: "同步研究問題" },
                    background: { en: "Synced background", zh: "同步背景" },
                    purpose: { en: "Synced purpose", zh: "同步目的" },
                    method: { en: "Synced method", zh: "" },
                    result: { en: "Synced result", zh: "同步結果" },
                    contribution: { en: "Synced contribution", zh: "同步貢獻" },
                    abstract: { en: "Synced abstract", zh: "同步摘要" },
                }),
            ),
        /method.zh/,
    );
});
