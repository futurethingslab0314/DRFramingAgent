import test from "node:test";
import assert from "node:assert/strict";

import { parseInterpretationSummary } from "./interpretContext.js";

test("parseInterpretationSummary returns required interpretation fields", () => {
    const parsed = parseInterpretationSummary(
        JSON.stringify({
            topic_summary: "AI reflection tools for design learning",
            context_summary: "Graduate studio critique settings in HCI education",
            goal_summary: "Understand how prompts shape reflective uncertainty",
            method_constraints_summary: "Prefer research through design",
            inferred_research_direction: "Exploratory framing with material inquiry",
            inferred_contribution_mode: "A new lens for reflective learning artifacts",
            possible_risks: ["Input is broad"],
            steering_keywords: ["reflection", "studio critique", "uncertainty"],
        }),
    );

    assert.deepEqual(parsed, {
        topic_summary: "AI reflection tools for design learning",
        context_summary: "Graduate studio critique settings in HCI education",
        goal_summary: "Understand how prompts shape reflective uncertainty",
        method_constraints_summary: "Prefer research through design",
        inferred_research_direction: "Exploratory framing with material inquiry",
        inferred_contribution_mode: "A new lens for reflective learning artifacts",
        possible_risks: ["Input is broad"],
        steering_keywords: ["reflection", "studio critique", "uncertainty"],
    });
});

test("parseInterpretationSummary rejects missing steering keywords", () => {
    assert.throws(
        () =>
            parseInterpretationSummary(
                JSON.stringify({
                    topic_summary: "AI reflection tools for design learning",
                    context_summary: "Graduate studio critique settings in HCI education",
                    goal_summary: "Understand how prompts shape reflective uncertainty",
                    inferred_research_direction: "Exploratory framing with material inquiry",
                    inferred_contribution_mode: "A new lens for reflective learning artifacts",
                    possible_risks: ["Input is broad"],
                }),
            ),
        /steering_keywords/,
    );
});
