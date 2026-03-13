import test from "node:test";
import assert from "node:assert/strict";

import {
    composeResearchContext,
    parseStructuredResearchContext,
} from "./researchContext.js";

test("parseStructuredResearchContext trims and normalizes the new four-field payload", () => {
    const parsed = parseStructuredResearchContext({
        context: {
            research_topic: "  AI reflection tools  ",
            target_context: "  design studio education ",
            research_goal: " understand reflective uncertainty ",
            method_or_constraints: "  research through design ",
        },
    });

    assert.deepEqual(parsed, {
        research_topic: "AI reflection tools",
        target_context: "design studio education",
        research_goal: "understand reflective uncertainty",
        method_or_constraints: "research through design",
    });
});

test("parseStructuredResearchContext accepts legacy user_context payloads for compatibility", () => {
    const parsed = parseStructuredResearchContext({
        user_context: "  legacy freeform context  ",
    });

    assert.deepEqual(parsed, {
        research_topic: "legacy freeform context",
        target_context: "Legacy context",
        research_goal: "Generate framing from the provided research context.",
    });
});

test("parseStructuredResearchContext rejects missing required fields in the new payload", () => {
    assert.throws(
        () =>
            parseStructuredResearchContext({
                context: {
                    research_topic: "AI reflection tools",
                    target_context: " ",
                    research_goal: "understand reflective uncertainty",
                },
            }),
        /target_context is required/,
    );
});

test("composeResearchContext produces labeled sections and omits empty optional fields", () => {
    const text = composeResearchContext({
        research_topic: "AI reflection tools",
        target_context: "design studio education",
        research_goal: "understand reflective uncertainty",
    });

    assert.equal(
        text,
        [
            "Research topic:",
            "AI reflection tools",
            "",
            "Target context:",
            "design studio education",
            "",
            "Research goal:",
            "understand reflective uncertainty",
        ].join("\n"),
    );
});
