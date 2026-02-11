import OpenAI from "openai";

/**
 * Server-only OpenAI client singleton.
 * This file must NEVER be imported from client components.
 */

if (!process.env.OPENAI_API_KEY) {
    console.warn(
        "[AI] OPENAI_API_KEY is not set. AI features will be disabled."
    );
}

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
});

export const AI_MODEL = "gpt-4o-mini";
