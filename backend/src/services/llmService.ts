// ═══════════════════════════════════════════════════════════════
// LLM Service — thin OpenAI wrapper
// ═══════════════════════════════════════════════════════════════

import OpenAI from "openai";

let _client: OpenAI | null = null;

function openai(): OpenAI {
    if (!_client) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
        _client = new OpenAI({ apiKey });
    }
    return _client;
}

/**
 * Call the LLM with a system + user message pair.
 *
 * This function signature matches what all LLM-backed skills expect:
 *   `(system: string, user: string) => Promise<string>`
 */
export async function callLLM(
    system: string,
    user: string,
): Promise<string> {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o";

    const response = await openai().chat.completions.create({
        model,
        messages: [
            { role: "system", content: system },
            { role: "user", content: user },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error("LLM returned empty response");
    }

    return content;
}
