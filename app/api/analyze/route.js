import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const runtime = "nodejs";

const ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    score: {
      type: SchemaType.INTEGER,
      description: "A quality score from 0 to 100 evaluating the prompt.",
    },
    verdict: {
      type: SchemaType.STRING,
      description: "Evaluation verdict: 'Good', 'Average', or 'Needs Improvement'.",
      enum: ["Good", "Average", "Needs Improvement"],
    },
    mistakes: {
      type: SchemaType.ARRAY,
      description: "List of missing elements, weaknesses, or mistakes (e.g. missing role/persona, lack of context, vague instructions, undefined output format).",
      items: {
        type: SchemaType.STRING,
      },
    },
    optimizedPrompt: {
      type: SchemaType.STRING,
      description: "The rewritten, production-grade, highly structured version of the prompt using professional prompt engineering best practices.",
    },
  },
  required: ["score", "verdict", "mistakes", "optimizedPrompt"],
};

const SYSTEM_INSTRUCTION = `You are an expert Prompt Engineer.
Analyze the user's prompt and evaluate it based on core prompt engineering principles:
1. Persona / Role: Is a specific expert persona defined?
2. Context: Is sufficient background information and scenario context provided?
3. Task Clarity: Is the primary objective, scope, and step-by-step goal unambiguous?
4. Constraints & Guardrails: Are negative constraints, boundaries, tone, or limitations specified?
5. Output Format: Is the desired output structure (e.g., markdown headers, bullet points, JSON, code blocks) explicitly stated?

Evaluate the prompt rigorously and return a strict JSON object with:
- score (0 to 100)
- verdict ("Good", "Average", or "Needs Improvement")
- mistakes (array of strings listing missing context, role, or format)
- optimizedPrompt (the rewritten, structured version of the prompt)
`;

function cleanJsonText(rawText) {
  let text = rawText.trim();
  if (text.startsWith("```json")) {
    text = text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  }
  return text;
}

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const { prompt } = body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return Response.json(
        { error: "The 'prompt' field is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env.local file.",
        },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Primary model is gemini-2.5-flash as requested; fallbacks ensure resilience across environments
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    let lastError = null;
    let analysisResult = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: ANALYSIS_SCHEMA,
            temperature: 0.2,
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        });

        const promptInput = `Please analyze and optimize this prompt:\n\n"""\n${prompt.trim()}\n"""`;
        const result = await model.generateContent(promptInput);
        const responseText = result.response.text();

        const cleanedJson = cleanJsonText(responseText);
        const parsed = JSON.parse(cleanedJson);

        // Validate expected keys
        if (
          typeof parsed.score === "number" &&
          typeof parsed.verdict === "string" &&
          Array.isArray(parsed.mistakes) &&
          typeof parsed.optimizedPrompt === "string"
        ) {
          analysisResult = parsed;
          break;
        }
      } catch (err) {
        lastError = err;
        // Continue to fallback model if this model failed (e.g. 404 deprecated or 503 capacity)
        continue;
      }
    }

    if (!analysisResult) {
      console.error("Gemini API error:", lastError);
      return Response.json(
        {
          error:
            lastError?.message ||
            "Failed to analyze prompt with Gemini API. Please check your API key and quota.",
        },
        { status: 502 }
      );
    }

    return Response.json(analysisResult, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in /api/analyze:", error);
    return Response.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
