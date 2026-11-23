import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
    weaknesses: {
      type: SchemaType.ARRAY,
      description: "List of missing elements, weaknesses, or mistakes found in the raw prompt.",
      items: {
        type: SchemaType.STRING,
      },
    },
    optimizedPrompt: {
      type: SchemaType.STRING,
      description: "The rewritten, production-grade, highly structured version of the prompt using professional prompt engineering best practices.",
    },
  },
  required: ["score", "verdict", "weaknesses", "optimizedPrompt"],
};

const SYSTEM_INSTRUCTION = `You are a World-Class Principal Prompt Engineer and LLM Architect.
Your task is to analyze the user's raw AI prompt, evaluate its quality, detect missing critical elements, and provide a masterfully structured, optimized version using Gemini prompt engineering best practices.

EVALUATION CRITERIA:
1. Persona & Role: Is a specific expert persona defined to guide tone, vocabulary, and depth?
2. Context & Background: Is sufficient background information and scenario context provided?
3. Task Clarity: Is the primary objective, scope, and step-by-step goal unambiguous?
4. Constraints & Guardrails: Are negative constraints, boundaries, tone, or limitations specified?
5. Expected Output Format: Is the desired output structure (e.g., markdown headers, bullet points, JSON, code blocks) explicitly stated?

INTENT DETECTION:
- If the user's prompt is an Image Generation or Photo Editing request (e.g. "make this photo aesthetic", "change background to sunset", "generate cinematic cyberpunk street"):
  - Rewrite as a direct visual generation instruction describing lighting, color grading, camera angle, textures, mood, and composition (e.g. "Transform the uploaded photo into...").
  - NEVER use tutorial words like "explain how to", "give step-by-step instructions", or "provide a guide".
- For text, coding, or writing tasks:
  - Rewrite as a clear, structured prompt with Role, Context, Task, Constraints, and Output Format.

Return a STRICT JSON object with:
- score (integer 0 to 100)
- verdict ("Good", "Average", or "Needs Improvement")
- weaknesses (array of 2 to 4 specific missing elements or flaws in the user's raw prompt)
- optimizedPrompt (the production-ready, improved version of the prompt)
`;

function cleanJsonText(rawText) {
  let text = (rawText || "").trim();
  if (text.startsWith("```json")) {
    text = text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  }
  return text;
}

function sanitizeScore(val, fallback = 75) {
  if (typeof val === "number" && !isNaN(val)) {
    return Math.max(0, Math.min(100, Math.round(val)));
  }
  return fallback;
}

function sanitizeVerdict(verdict, score) {
  if (
    verdict === "Good" ||
    verdict === "Average" ||
    verdict === "Needs Improvement"
  ) {
    return verdict;
  }
  if (score >= 80) return "Good";
  if (score >= 50) return "Average";
  return "Needs Improvement";
}

function sanitizeWeaknesses(list, fallback = ["Missing explicit constraints and clear formatting guidelines."]) {
  if (Array.isArray(list) && list.length > 0) {
    return list.map((item) => String(item).trim()).filter(Boolean);
  }
  return fallback;
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

    const trimmedPrompt = prompt.trim();

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
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    let lastError = null;
    let parsedResult = null;

    const userPromptPayload = `Please analyze, critique, and optimize this raw prompt:\n\n"""\n${trimmedPrompt}\n"""\n\nReturn strict JSON matching the schema.`;

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

        const result = await model.generateContent(userPromptPayload);
        const responseText = result.response.text();
        const cleaned = cleanJsonText(responseText);
        parsedResult = JSON.parse(cleaned);

        if (parsedResult && typeof parsedResult === "object") {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${modelName} failed, trying next model:`, err.message);
        continue;
      }
    }

    if (!parsedResult) {
      console.error("Gemini optimization error:", lastError);
      return Response.json(
        {
          error:
            lastError?.message ||
            "Failed to analyze and optimize prompt with Gemini. Please verify your GEMINI_API_KEY and quota.",
        },
        { status: 502 }
      );
    }

    const score = sanitizeScore(parsedResult.score, 75);
    const verdict = sanitizeVerdict(parsedResult.verdict, score);
    const weaknesses = sanitizeWeaknesses(
      parsedResult.weaknesses || parsedResult.mistakes,
      [
        "Lacks clear background context and target scenario.",
        "Missing explicit constraints, tone guidelines, and output structure.",
      ]
    );
    const optimizedPrompt =
      typeof parsedResult.optimizedPrompt === "string" && parsedResult.optimizedPrompt.trim()
        ? parsedResult.optimizedPrompt.trim()
        : typeof parsedResult.optimized_prompt === "string" && parsedResult.optimized_prompt.trim()
        ? parsedResult.optimized_prompt.trim()
        : trimmedPrompt;

    return Response.json(
      {
        score,
        verdict,
        weaknesses,
        mistakes: weaknesses,
        optimizedPrompt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in /api/analyze:", error);
    return Response.json(
      { error: error?.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
