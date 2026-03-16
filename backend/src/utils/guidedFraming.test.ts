import test from "node:test";
import assert from "node:assert/strict";

import { buildGuidedExpansion } from "./guidedFraming.js";

test("buildGuidedExpansion returns student-facing guidance buckets", () => {
    const result = buildGuidedExpansion([
        {
            term: "critical design",
            active: true,
            orientation: "critical",
            artifact_role: "critique_device",
            weight: 1,
        },
    ]);

    assert.ok(Array.isArray(result.lenses));
    assert.ok(Array.isArray(result.contexts));
    assert.ok(Array.isArray(result.tensions));
});

test("buildGuidedExpansion returns structured tension metadata", () => {
    const result = buildGuidedExpansion([
        {
            term: "ethnography",
            active: true,
            orientation: "critical",
            artifact_role: "critique_device",
            weight: 1,
        },
    ]);

    assert.equal(
        result.tensions[0]?.metadata !== undefined
            && "patternType" in result.tensions[0].metadata,
        true,
    );
    assert.equal(
        result.tensions[0]?.metadata !== undefined
            && Array.isArray(result.tensions[0].metadata.sourceKeywords),
        true,
    );
});

test("buildGuidedExpansion emits paired tension labels instead of default-assumption placeholders", () => {
    const result = buildGuidedExpansion([
        {
            term: "design fiction",
            active: true,
            orientation: "critical",
            artifact_role: "critique_device",
            weight: 1,
        },
    ]);

    assert.equal(
        result.tensions.some((item) => item.label.includes("default assumptions")),
        false,
    );
    assert.equal(result.tensions[0].label.includes(" vs "), true);
});

test("buildGuidedExpansion returns structured context metadata and avoids echoing raw keywords", () => {
    const result = buildGuidedExpansion(
        [
            {
                term: "design education",
                active: true,
                orientation: "constructive",
                artifact_role: "epistemic_mediator",
                weight: 1,
            },
            {
                term: "critique culture",
                active: true,
                orientation: "critical",
                artifact_role: "critique_device",
                weight: 0.8,
            },
        ],
        {
            ideaSeed: "conversational agent for design students to practice design pitches",
        },
    );

    assert.equal(result.contexts[0]?.label === "design education", false);
    assert.equal(
        result.contexts[0]?.metadata !== undefined
            && "contextType" in result.contexts[0].metadata
            ? result.contexts[0].metadata.contextType
            : undefined,
        "setting_oriented",
    );
    assert.equal(
        result.contexts[0]?.metadata !== undefined
            && Array.isArray(result.contexts[0].metadata.sourceKeywords),
        true,
    );
});
