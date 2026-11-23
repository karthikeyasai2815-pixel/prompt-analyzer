import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    best: {
      type: SchemaType.OBJECT,
      properties: {
        winner: {
          type: SchemaType.STRING,
          description: "Model id of the overall winner: 'gemini', 'chatgpt', or 'claude'",
          enum: ["gemini", "chatgpt", "claude"],
        },
        winnerName: {
          type: SchemaType.STRING,
          description: "Display name of winner: 'Gemini', 'ChatGPT', or 'Claude'",
        },
        reason: {
          type: SchemaType.STRING,
          description: "1-2 sentences explaining why this model's prompt won overall based on clarity, specificity, and effectiveness.",
        },
      },
      required: ["winner", "winnerName", "reason"],
    },
    models: {
      type: SchemaType.OBJECT,
      properties: {
        gemini: {
          type: SchemaType.OBJECT,
          properties: {
            score: {
              type: SchemaType.INTEGER,
              description: "Quality score from 0 to 100",
            },
            verdict: {
              type: SchemaType.STRING,
              description: "Verdict: 'Good', 'Average', or 'Needs Improvement'",
              enum: ["Good", "Average", "Needs Improvement"],
            },
            weaknesses: {
              type: SchemaType.ARRAY,
              description: "List of missing elements or weaknesses found in the raw prompt",
              items: { type: SchemaType.STRING },
            },
            optimizedPrompt: {
              type: SchemaType.STRING,
              description: "Prompt optimized specifically for Gemini (concise, direct, context-rich, high-density instructions)",
            },
          },
          required: ["score", "verdict", "weaknesses", "optimizedPrompt"],
        },
        chatgpt: {
          type: SchemaType.OBJECT,
          properties: {
            score: {
              type: SchemaType.INTEGER,
              description: "Quality score from 0 to 100",
            },
            verdict: {
              type: SchemaType.STRING,
              description: "Verdict: 'Good', 'Average', or 'Needs Improvement'",
              enum: ["Good", "Average", "Needs Improvement"],
            },
            weaknesses: {
              type: SchemaType.ARRAY,
              description: "List of missing elements or weaknesses found in the raw prompt",
              items: { type: SchemaType.STRING },
            },
            optimizedPrompt: {
              type: SchemaType.STRING,
              description: "Prompt optimized specifically for ChatGPT (clear expert persona, bulleted constraints and guardrails, explicit task goals, and clear format specification)",
            },
          },
          required: ["score", "verdict", "weaknesses", "optimizedPrompt"],
        },
        claude: {
          type: SchemaType.OBJECT,
          properties: {
            score: {
              type: SchemaType.INTEGER,
              description: "Quality score from 0 to 100",
            },
            verdict: {
              type: SchemaType.STRING,
              description: "Verdict: 'Good', 'Average', or 'Needs Improvement'",
              enum: ["Good", "Average", "Needs Improvement"],
            },
            weaknesses: {
              type: SchemaType.ARRAY,
              description: "List of missing elements or weaknesses found in the raw prompt",
              items: { type: SchemaType.STRING },
            },
            optimizedPrompt: {
              type: SchemaType.STRING,
              description: "Prompt optimized specifically for Claude (structured with semantic XML tags like <instructions>, <context>, <constraints>, <output_format>)",
            },
          },
          required: ["score", "verdict", "weaknesses", "optimizedPrompt"],
        },
      },
      required: ["gemini", "chatgpt", "claude"],
    },
  },
  required: ["best", "models"],
};

const SYSTEM_INSTRUCTION = `You are a World-Class Principal Prompt Engineer and LLM Architect.
Your task is to analyze the user's raw AI prompt and produce THREE DISTINCT, TAILORED prompt optimizations—each engineered specifically for the prompt conventions and strengths of major AI models:

1. GEMINI OPTIMIZATION (concise, context-rich):
   - Style: Direct, information-dense, and context-rich.
   - Grounded with clear background knowledge, unambiguous objective, and efficient phrasing without conversational filler.
   - Capitalizes on Google Gemini's multimodal and large-context reasoning capabilities.

2. CHATGPT OPTIMIZATION (clear persona, bulleted constraints):
   - Style: Explicit Role/Persona definition, step-by-step task breakdown, bulleted negative constraints and boundaries, and explicit output format expectations.
   - Formatted with clean Markdown headings and bullet points tailored for OpenAI GPT-4o models.

3. CLAUDE OPTIMIZATION (structured with XML tags):
   - Style: Structured with semantic XML tags such as <context>, <instructions>, <task>, <constraints>, and <output_format>.
   - Incorporates Anthropic Claude's recommended prompt scaffolding to maximize steering accuracy and minimize hallucination.

INTENT DETECTION:
- If the user's prompt is an Image Generation or Photo Editing request (e.g. "make this photo aesthetic", "change background to sunset", "generate cinematic cyberpunk street"):
  - Rewrite as a direct visual generation instruction describing lighting, color grading, camera angle, textures, mood, and composition (e.g. "Transform the uploaded photo into...").
  - NEVER use tutorial words like "explain how to", "give step-by-step instructions", or "provide a guide".

EVALUATION & BENCHMARKING:
- For each model's evaluation of the original raw prompt:
  - Assign an objective quality score from 0 to 100.
  - Set a verdict: "Good" (80-100), "Average" (50-79), or "Needs Improvement" (0-49).
  - List 2 to 4 specific weaknesses or missing elements (e.g. missing role, vague constraints, lacks output format).
- Compare the three generated prompts against clarity, specificity, and effectiveness.
- Select the single Overall Best Prompt winner ('gemini', 'chatgpt', or 'claude').
- Provide a concise 1-2 sentence explanation of why this model's version won overall.

You MUST return a strict JSON object matching the requested schema.`;

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

    const userPromptPayload = `Analyze and optimize this raw prompt across Gemini, ChatGPT, and Claude:\n\n"""\n${trimmedPrompt}\n"""\n\nGenerate the three model-specific prompt optimizations, individual quality scores, weaknesses, and select the Best Overall Prompt winner. Return strict JSON.`;

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

        if (parsedResult && parsedResult.models && parsedResult.best) {
          break; // successfully got full analysis
        }
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${modelName} failed, trying next model:`, err.message);
        continue;
      }
    }

    if (!parsedResult || !parsedResult.models) {
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

    // 1. Normalize Gemini Model Data
    const rawGemini = parsedResult.models.gemini || {};
    const geminiScore = sanitizeScore(rawGemini.score, 88);
    const geminiWeaknesses = sanitizeWeaknesses(rawGemini.weaknesses, [
      "Lacks clear background context and target scenario.",
      "Could benefit from more concise, information-dense phrasing.",
    ]);
    const geminiPrompt =
      typeof rawGemini.optimizedPrompt === "string" && rawGemini.optimizedPrompt.trim()
        ? rawGemini.optimizedPrompt.trim()
        : trimmedPrompt;

    const geminiModel = {
      score: geminiScore,
      verdict: sanitizeVerdict(rawGemini.verdict, geminiScore),
      weaknesses: geminiWeaknesses,
      mistakes: geminiWeaknesses,
      optimizedPrompt: geminiPrompt,
      status: "success",
    };

    // 2. Normalize ChatGPT Model Data
    const rawChatGPT = parsedResult.models.chatgpt || {};
    const chatgptScore = sanitizeScore(rawChatGPT.score, 90);
    const chatgptWeaknesses = sanitizeWeaknesses(rawChatGPT.weaknesses, [
      "Missing explicit expert persona / role definition.",
      "Negative constraints and guardrails are not specified.",
    ]);
    const chatgptPrompt =
      typeof rawChatGPT.optimizedPrompt === "string" && rawChatGPT.optimizedPrompt.trim()
        ? rawChatGPT.optimizedPrompt.trim()
        : trimmedPrompt;

    const chatgptModel = {
      score: chatgptScore,
      verdict: sanitizeVerdict(rawChatGPT.verdict, chatgptScore),
      weaknesses: chatgptWeaknesses,
      mistakes: chatgptWeaknesses,
      optimizedPrompt: chatgptPrompt,
      status: "success",
    };

    // 3. Normalize Claude Model Data
    const rawClaude = parsedResult.models.claude || {};
    const claudeScore = sanitizeScore(rawClaude.score, 93);
    const claudeWeaknesses = sanitizeWeaknesses(rawClaude.weaknesses, [
      "No structural XML tags (<instructions>, <context>) to guide reasoning.",
      "Expected output format is ambiguous.",
    ]);
    const claudePrompt =
      typeof rawClaude.optimizedPrompt === "string" && rawClaude.optimizedPrompt.trim()
        ? rawClaude.optimizedPrompt.trim()
        : trimmedPrompt;

    const claudeModel = {
      score: claudeScore,
      verdict: sanitizeVerdict(rawClaude.verdict, claudeScore),
      weaknesses: claudeWeaknesses,
      mistakes: claudeWeaknesses,
      optimizedPrompt: claudePrompt,
      status: "success",
    };

    // 4. Resolve Overall Best Prompt Winner
    const validWinners = ["gemini", "chatgpt", "claude"];
    let winnerKey = (parsedResult.best?.winner || "").toLowerCase().trim();
    if (!validWinners.includes(winnerKey)) {
      // Pick model with highest score as winner fallback
      const candidates = [
        { key: "claude", score: claudeScore },
        { key: "chatgpt", score: chatgptScore },
        { key: "gemini", score: geminiScore },
      ];
      candidates.sort((a, b) => b.score - a.score);
      winnerKey = candidates[0].key;
    }

    const winnerDisplayNames = {
      gemini: "Gemini",
      chatgpt: "ChatGPT",
      claude: "Claude",
    };

    const winningModel =
      winnerKey === "chatgpt"
        ? chatgptModel
        : winnerKey === "claude"
        ? claudeModel
        : geminiModel;

    const winnerName =
      parsedResult.best?.winnerName || winnerDisplayNames[winnerKey];

    const reason =
      parsedResult.best?.reason ||
      `${winnerName}'s tailored prompt provided the strongest balance of clarity, contextual specificity, and actionable constraints.`;

    const bestData = {
      winner: winnerKey,
      winnerName,
      reason,
      optimizedPrompt: winningModel.optimizedPrompt,
      score: winningModel.score,
    };

    return Response.json(
      {
        best: bestData,
        models: {
          gemini: geminiModel,
          chatgpt: chatgptModel,
          claude: claudeModel,
        },
        // Backward-compatible top-level fields
        score: winningModel.score,
        verdict: winningModel.verdict,
        weaknesses: winningModel.weaknesses,
        mistakes: winningModel.mistakes,
        optimizedPrompt: winningModel.optimizedPrompt,
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
