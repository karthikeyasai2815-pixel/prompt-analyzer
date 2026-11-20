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

const SYSTEM_INSTRUCTION = `You are an expert Prompt Engineer with deep expertise in both text/code prompts AND visual image-generation prompts.

STEP 1 — INTENT DETECTION:
Before analyzing, classify the user's prompt into one of two categories:

A) IMAGE GENERATION / PHOTO EDITING — if the prompt asks to generate, create, edit, transform, enhance, stylize, or manipulate a photo, image, picture, illustration, artwork, or visual (e.g. "make this photo aesthetic", "change the background to a sunset", "generate a cyberpunk cityscape", "edit this image to look vintage", "turn my selfie into an oil painting").

B) TEXT / CODE / WRITING — everything else (e.g. "write a blog post", "review my code", "draft an email", "explain quantum computing").

STEP 2 — ANALYSIS & OPTIMIZATION:

For BOTH categories, evaluate the prompt against these principles and score accordingly:
1. Specificity: Is the request precise rather than vague?
2. Context: Is enough background, subject matter, or reference information provided?
3. Constraints: Are boundaries, limitations, style preferences, or negative constraints defined?
4. Output Clarity: Is the desired result clearly described?

Then produce the optimizedPrompt differently based on category:

--- IF CATEGORY A (Image Generation / Photo Editing) ---
Rewrite the optimizedPrompt as a DIRECT VISUAL IMAGE-GENERATION INSTRUCTION. It must:
- Start with action words like "Transform the uploaded photo into...", "Edit this image to...", "Generate a...", "Create a..."
- Describe visual attributes in detail: lighting (golden hour, soft diffused, dramatic rim light), color grading (warm amber tones, cool desaturated blues, film-like grain), textures, mood/atmosphere, composition, depth of field, camera angle
- Be a single cohesive visual directive that an image-generation AI (like DALL-E, Midjourney, Gemini Vision, or Stable Diffusion) can execute directly
- NEVER include instructional language like "give step-by-step instructions", "explain how to", "provide a guide", "list the steps", "write a tutorial" — these are forbidden in image prompts
- NEVER frame the output as text instructions about editing — it must BE the image prompt itself

--- IF CATEGORY B (Text / Code / Writing) ---
Rewrite the optimizedPrompt as a clear, structured prompt with:
- Role / Persona: Assign a specific expert identity
- Context & Background: Explain the scenario, audience, and purpose
- Task: Break the goal into concrete, unambiguous instructions
- Constraints & Guardrails: Define tone, length, what to avoid, edge cases
- Output Format: Specify the deliverable structure (markdown, JSON, code blocks, bullet points, etc.)

Return a strict JSON object with:
- score (0 to 100)
- verdict ("Good", "Average", or "Needs Improvement")
- mistakes (array of strings listing missing or weak elements)
- optimizedPrompt (the rewritten prompt following the rules above for the detected category)
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
