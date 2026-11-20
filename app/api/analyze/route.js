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
    weaknesses: {
      type: SchemaType.ARRAY,
      description: "List of missing elements, weaknesses, or mistakes.",
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
- weaknesses (array of strings listing missing or weak elements)
- mistakes (same array of strings)
- optimizedPrompt (the rewritten prompt following the rules above for the detected category)
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

// 1. Gemini provider
async function analyzeWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env.local file."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  let lastError = null;

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
      return JSON.parse(cleanedJson);
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Failed to analyze prompt with Gemini API.");
}

// 2. ChatGPT (OpenAI) provider
async function analyzeWithChatGPT(prompt) {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    "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";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your .env.local file."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            SYSTEM_INSTRUCTION +
            '\n\nYou MUST return a strict JSON object matching: {"score": number, "verdict": "Good"|"Average"|"Needs Improvement", "weaknesses": string[], "mistakes": string[], "optimizedPrompt": string}',
        },
        {
          role: "user",
          content: `Please analyze and optimize this prompt:\n\n"""\n${prompt.trim()}\n"""`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error?.message ||
        `OpenAI API returned status ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || "";
  const cleaned = cleanJsonText(rawText);
  return JSON.parse(cleaned);
}

// 3. Claude (Anthropic) provider
async function analyzeWithClaude(prompt) {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    "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";

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Please set ANTHROPIC_API_KEY in your .env.local file."
    );
  }

  const modelsToTry = [
    "claude-sonnet-5-5",
    "claude-haiku-5-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system:
            SYSTEM_INSTRUCTION +
            '\n\nYou MUST return ONLY a valid JSON object matching: {"score": number, "verdict": "Good"|"Average"|"Needs Improvement", "weaknesses": string[], "mistakes": string[], "optimizedPrompt": string}. Output no text outside the JSON.',
          messages: [
            {
              role: "user",
              content: `Please analyze and optimize this prompt:\n\n"""\n${prompt.trim()}\n"""\n\nReturn strict JSON:`,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errMsg =
          errorData?.error?.message ||
          `Anthropic API returned status ${response.status}: ${response.statusText}`;

        // If model not found or invalid model identifier, try fallback
        if (response.status === 404 || errMsg.toLowerCase().includes("model")) {
          lastError = new Error(errMsg);
          continue;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      const rawText = data?.content?.[0]?.text || "";
      const cleaned = cleanJsonText(rawText);
      return JSON.parse(cleaned);
    } catch (err) {
      lastError = err;
      if (
        err.message &&
        (err.message.toLowerCase().includes("model") || err.message.includes("404"))
      ) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to analyze prompt with Claude API.");
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

    const { prompt, provider = "gemini" } = body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return Response.json(
        { error: "The 'prompt' field is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const selectedProvider = (provider || "gemini").toString().trim().toLowerCase();

    let analysisResult = null;

    if (selectedProvider === "chatgpt" || selectedProvider === "openai") {
      analysisResult = await analyzeWithChatGPT(prompt);
    } else if (selectedProvider === "claude" || selectedProvider === "anthropic") {
      analysisResult = await analyzeWithClaude(prompt);
    } else {
      analysisResult = await analyzeWithGemini(prompt);
    }

    if (!analysisResult) {
      return Response.json(
        { error: `Failed to receive analysis from ${selectedProvider}.` },
        { status: 502 }
      );
    }

    // Normalize output so all providers return the exact same JSON structure
    const score =
      typeof analysisResult.score === "number"
        ? Math.max(0, Math.min(100, Math.round(analysisResult.score)))
        : 70;

    const verdict =
      analysisResult.verdict === "Good" ||
      analysisResult.verdict === "Average" ||
      analysisResult.verdict === "Needs Improvement"
        ? analysisResult.verdict
        : score >= 80
        ? "Good"
        : score >= 50
        ? "Average"
        : "Needs Improvement";

    const issues = Array.isArray(analysisResult.weaknesses)
      ? analysisResult.weaknesses
      : Array.isArray(analysisResult.mistakes)
      ? analysisResult.mistakes
      : ["Missing explicit constraints and clear output formatting."];

    const optimizedPrompt =
      typeof analysisResult.optimizedPrompt === "string" &&
      analysisResult.optimizedPrompt.trim().length > 0
        ? analysisResult.optimizedPrompt.trim()
        : typeof analysisResult.optimized_prompt === "string" &&
          analysisResult.optimized_prompt.trim().length > 0
        ? analysisResult.optimized_prompt.trim()
        : prompt;

    return Response.json(
      {
        score,
        verdict,
        weaknesses: issues,
        mistakes: issues,
        optimizedPrompt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return Response.json(
      { error: error?.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
