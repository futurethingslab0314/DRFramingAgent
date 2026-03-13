import test from "node:test";
import assert from "node:assert/strict";

import { parseBilingualFramingLocalization } from "./bilingualFramingLocalizer.js";

test("parseBilingualFramingLocalization returns complete zh fields", () => {
    const parsed = parseBilingualFramingLocalization(
        JSON.stringify({
            title_zh: "設計研究標題",
            research_question_zh: "研究問題中文",
            background_zh: "研究背景中文",
            purpose_zh: "研究目的中文",
            method_zh: "研究方法中文",
            result_zh: "研究結果中文",
            contribution_zh: "研究貢獻中文",
        }),
    );

    assert.deepEqual(parsed, {
        title: "設計研究標題",
        research_question: "研究問題中文",
        background: "研究背景中文",
        purpose: "研究目的中文",
        method: "研究方法中文",
        result: "研究結果中文",
        contribution: "研究貢獻中文",
    });
});

test("parseBilingualFramingLocalization rejects missing zh keys", () => {
    assert.throws(
        () =>
            parseBilingualFramingLocalization(
                JSON.stringify({
                    title_zh: "設計研究標題",
                    research_question_zh: "研究問題中文",
                }),
            ),
        /background_zh/,
    );
});
